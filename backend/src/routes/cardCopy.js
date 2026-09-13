import { Router } from 'express';
import { parseClipboardText, validate } from '../services/cardCopyParser.js';
import { parseTIDData } from '../services/cardCopyTidParser.js';
import { generateOrderHash, generateEncryptedClientData } from '../services/cardCopyCrypto.js';
import {
  saveApprovedOrder,
  getAllOrders,
  getOrderById,
  updateRemark,
  refreshChipIdentities,
} from '../services/cardCopyOrders.js';

const router = Router();

// Re-run TID analysis and validation against the (possibly edited) fields the
// client sent, so approval always reflects what the operator sees.
function analyzeFields({ orderId, dataA, dataB, dataC, dataD }) {
  const data = {
    orderId: (orderId ?? '').trim(),
    dataA: dataA ?? null,
    dataB: dataB ?? null,
    dataC: dataC ?? null,
    dataD: dataD ?? null,
  };

  if (data.dataC) {
    const tid = parseTIDData(data.dataC);
    data.tagClass = tid.tagClass;
    data.vendor = tid.vendor;
    data.tagFamily = tid.tagFamily;
    data.tagModel = tid.tagModel;
    data.modelNotes = tid.modelNotes;
    data.xtidSupported = tid.xtidSupported;
  } else {
    data.tagClass = 'N/A';
    data.vendor = 'N/A';
    data.tagFamily = 'N/A';
    data.tagModel = 'N/A';
    data.modelNotes = 'N/A';
    data.xtidSupported = 'N/A';
  }

  validate(data);
  return data;
}

// POST /api/card-copy/parse — preview parse of pasted client data (no DB write).
router.post('/parse', (req, res) => {
  try {
    const { text } = req.body;
    if (typeof text !== 'string') {
      return res.status(400).json({ error: 'text is required' });
    }
    res.json(parseClipboardText(text));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to parse client data' });
  }
});

// POST /api/card-copy/approve — approve (possibly edited) fields, save, and
// return the encrypted client blob.
router.post('/approve', async (req, res) => {
  try {
    const data = analyzeFields(req.body);
    if (!data.isValid) {
      return res.status(400).json({ error: data.validationMessage || 'Invalid order data' });
    }

    const verificationHash = generateOrderHash(data.orderId, data.dataB, data.dataC);
    const encryptedData = generateEncryptedClientData(data, verificationHash);

    const remark = typeof req.body.remark === 'string' ? req.body.remark.trim() : null;
    const order = await saveApprovedOrder({
      orderId: data.orderId,
      dataA: data.dataA,
      dataB: data.dataB,
      dataC: data.dataC,
      dataD: data.dataD,
      dataE: req.body.dataE ?? null,
      verificationHash,
      tagClass: data.tagClass,
      vendor: data.vendor,
      tagFamily: data.tagFamily,
      tagModel: data.tagModel,
      modelNotes: data.modelNotes,
      remark,
      receivedTime: req.body.receivedTime ?? null,
    });

    res.json({ order, verificationHash, encryptedData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to approve order' });
  }
});

// GET /api/card-copy?search= — list orders (refreshes chip identities first).
router.get('/', async (req, res) => {
  try {
    await refreshChipIdentities();
    const orders = await getAllOrders(req.query.search ?? '');
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// GET /api/card-copy/:id — one order.
router.get('/:id', async (req, res) => {
  try {
    const order = await getOrderById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// PUT /api/card-copy/:id/remark — update the remark.
router.put('/:id/remark', async (req, res) => {
  try {
    const remark = typeof req.body.remark === 'string' ? req.body.remark.trim() : '';
    const ok = await updateRemark(req.params.id, remark);
    if (!ok) return res.status(404).json({ error: 'Order not found' });
    res.json(await getOrderById(req.params.id));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update remark' });
  }
});

// POST /api/card-copy/:id/regenerate — rebuild the encrypted blob for a stored
// order, reusing its verification hash (mirrors HistoryForm regenerate).
router.post('/:id/regenerate', async (req, res) => {
  try {
    const order = await getOrderById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const encryptedData = generateEncryptedClientData(
      {
        orderId: order.order_id,
        dataA: order.data_a,
        dataB: order.data_b,
        dataC: order.data_c,
        dataD: order.data_d,
      },
      order.verification_hash
    );

    res.json({ encryptedData, verificationHash: order.verification_hash });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to regenerate encrypted data' });
  }
});

export default router;
