export const getLocalDate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const mergeDistinctValues = (existingValue, newValue) => {
  const values = `${existingValue || ''};${newValue || ''}`
    .split(';')
    .map(value => value.trim())
    .filter(Boolean);

  return [...new Set(values)].join('; ');
};

export const findStockReceiveByDate = (database, receiveDate) => (
  database.query(
    'get',
    `SELECT id, grn_no, sup_ref, supplier_name, lot_name, remarks
     FROM stock_receives
     WHERE DATE(rec_date) = ?
     ORDER BY created_at ASC, id ASC
     LIMIT 1`,
    [receiveDate]
  )
);

export const saveDailyStockReceive = async ({
  database,
  formData,
  selectedParts,
  generateNewGRNNo
}) => {
  const existingReceive = await findStockReceiveByDate(database, formData.rec_date);
  let stockReceiveId;
  let grnNo;

  if (existingReceive) {
    stockReceiveId = existingReceive.id;
    grnNo = existingReceive.grn_no;

    await database.query(
      'run',
      `UPDATE stock_receives
       SET sup_ref = ?, supplier_name = ?, lot_name = ?, remarks = ?,
           updated_at = datetime('now','localtime')
       WHERE id = ?`,
      [
        mergeDistinctValues(existingReceive.sup_ref, formData.sup_ref),
        mergeDistinctValues(existingReceive.supplier_name, formData.supplier_name),
        mergeDistinctValues(existingReceive.lot_name, formData.lot_name),
        mergeDistinctValues(existingReceive.remarks, formData.remarks),
        stockReceiveId
      ]
    );
  } else {
    grnNo = await generateNewGRNNo();
    if (!grnNo) {
      throw new Error('Failed to generate GRN number');
    }

    const result = await database.query(
      'run',
      `INSERT INTO stock_receives (
        grn_no, rec_date, sup_ref, supplier_name, lot_name,
        remarks, total_value, discount_value, final_value
      ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0)`,
      [
        grnNo,
        formData.rec_date,
        formData.sup_ref,
        formData.supplier_name,
        formData.lot_name,
        formData.remarks
      ]
    );

    stockReceiveId = result?.lastInsertRowid || result?.lastID;
    if (!stockReceiveId) {
      throw new Error('Failed to create stock receive');
    }
  }

  for (const part of selectedParts) {
    await database.query(
      'run',
      `INSERT INTO stock_receive_items (
        stock_receive_id, part_id, pro_no, item_description,
        unit_price, rec_qty, item_value, dis_percent,
        discount_value, final_value
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        stockReceiveId,
        part.id,
        part.pro_no,
        part.item_description,
        part.unit_price,
        part.rec_qty,
        part.item_value,
        part.dis_percent,
        part.discount_value,
        part.final_value
      ]
    );

    await database.query(
      'run',
      `UPDATE stock_movements
       SET grn_documented = 1, grn_no = ?
       WHERE part_id = ?
       AND movement_type = 'IN'
       AND (grn_documented = 0 OR grn_documented IS NULL)
       AND id IN (
         SELECT id FROM stock_movements
         WHERE part_id = ? AND movement_type = 'IN'
         AND (grn_documented = 0 OR grn_documented IS NULL)
         ORDER BY created_at ASC
         LIMIT ?
       )`,
      [grnNo, part.id, part.id, part.rec_qty]
    );
  }

  await database.query(
    'run',
    `UPDATE stock_receives
     SET total_value = COALESCE((
           SELECT SUM(item_value) FROM stock_receive_items WHERE stock_receive_id = ?
         ), 0),
         discount_value = COALESCE((
           SELECT SUM(discount_value) FROM stock_receive_items WHERE stock_receive_id = ?
         ), 0),
         final_value = COALESCE((
           SELECT SUM(final_value) FROM stock_receive_items WHERE stock_receive_id = ?
         ), 0),
         updated_at = datetime('now','localtime')
     WHERE id = ?`,
    [stockReceiveId, stockReceiveId, stockReceiveId, stockReceiveId]
  );

  return {
    grnNo,
    stockReceiveId,
    appended: Boolean(existingReceive),
    itemsAdded: selectedParts.length
  };
};
