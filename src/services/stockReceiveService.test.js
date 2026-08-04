import {
  documentStockMovementQuantity,
  getLocalDate,
  saveDailyStockReceive
} from './stockReceiveService';

const createPart = (id, finalValue, supplierName = 'Supplier A', supplierRef = '') => ({
  id,
  pro_no: `PRO-${id}`,
  item_description: `Part ${id}`,
  supplier_name: supplierName,
  sup_ref: supplierRef,
  unit_price: finalValue,
  rec_qty: 1,
  item_value: finalValue,
  dis_percent: 0,
  discount_value: 0,
  final_value: finalValue
});

describe('saveDailyStockReceive', () => {
  test('appends separate supplier rows for the same part to the existing daily GRN', async () => {
    const calls = [];
    const database = {
      query: jest.fn(async (type, sql, params) => {
        calls.push({ type, sql, params });
        if (type === 'get' && sql.includes('FROM stock_receives')) {
          return {
            id: 7,
            grn_no: 'GRN000007',
            lot_name: '',
            remarks: ''
          };
        }
        if (type === 'all' && sql.includes('FROM stock_movements')) {
          return [{ id: 100, quantity: 2, documented_quantity: 0 }];
        }
        return { changes: 1 };
      })
    };
    const generateNewGRNNo = jest.fn();

    const result = await saveDailyStockReceive({
      database,
      formData: {
        rec_date: '2026-08-05',
        lot_name: 'Lot B',
        remarks: 'Second delivery'
      },
      selectedParts: [
        createPart(10, 100, 'Supplier A', 'REF-1'),
        createPart(10, 250, 'Supplier B', 'REF-2')
      ],
      generateNewGRNNo
    });

    expect(result).toEqual({
      grnNo: 'GRN000007',
      stockReceiveId: 7,
      appended: true,
      itemsAdded: 2
    });
    expect(generateNewGRNNo).not.toHaveBeenCalled();
    expect(calls.some(call => call.sql.includes('INSERT INTO stock_receives'))).toBe(false);
    expect(calls.filter(call => call.sql.includes('INSERT INTO stock_receive_items'))).toHaveLength(2);
    expect(calls.filter(call => call.sql.includes('UPDATE stock_movements'))).toHaveLength(1);

    const headerUpdate = calls.find(call => call.sql.includes('SET lot_name = ?'));
    expect(headerUpdate.params).toEqual([
      'Lot B',
      'Second delivery',
      7
    ]);

    const itemInserts = calls.filter(call => call.sql.includes('INSERT INTO stock_receive_items'));
    expect(itemInserts[0].params.slice(4, 6)).toEqual(['Supplier A', 'REF-1']);
    expect(itemInserts[1].params.slice(4, 6)).toEqual(['Supplier B', 'REF-2']);
    expect(calls.some(call => call.sql.includes('SELECT SUM(final_value)'))).toBe(true);
  });

  test('creates the only GRN header when the receive date has no GRN', async () => {
    const calls = [];
    const database = {
      query: jest.fn(async (type, sql, params) => {
        calls.push({ type, sql, params });
        if (type === 'get') return null;
        if (sql.includes('INSERT INTO stock_receives')) return { lastInsertRowid: 9 };
        if (type === 'all' && sql.includes('FROM stock_movements')) {
          return [{ id: 101, quantity: 1, documented_quantity: 0 }];
        }
        return { changes: 1 };
      })
    };

    const result = await saveDailyStockReceive({
      database,
      formData: {
        rec_date: '2026-08-06',
        lot_name: '',
        remarks: ''
      },
      selectedParts: [createPart(12, 400)],
      generateNewGRNNo: jest.fn().mockResolvedValue('GRN000008')
    });

    expect(result.appended).toBe(false);
    expect(result.grnNo).toBe('GRN000008');
    expect(calls.filter(call => call.sql.includes('INSERT INTO stock_receives'))).toHaveLength(1);
    expect(calls.filter(call => call.sql.includes('INSERT INTO stock_receive_items'))).toHaveLength(1);
  });
});

test('keeps the unentered portion of a stock movement available for a later GRN save', async () => {
  const movement = { id: 1, quantity: 40, documented_quantity: 0, grn_documented: 0 };
  const database = {
    query: jest.fn(async (type, sql, params) => {
      if (type === 'all' && sql.includes('FROM stock_movements')) {
        const available = movement.quantity - movement.documented_quantity;
        return available > 0 ? [{ ...movement }] : [];
      }
      if (type === 'run' && sql.includes('UPDATE stock_movements')) {
        movement.documented_quantity = params[0];
        movement.grn_documented = params[1] >= movement.quantity ? 1 : 0;
        return { changes: 1 };
      }
      return { changes: 1 };
    })
  };

  await documentStockMovementQuantity({
    database,
    partId: 1,
    quantity: 20,
    grnNo: 'GRN000002'
  });

  expect(movement).toMatchObject({
    quantity: 40,
    documented_quantity: 20,
    grn_documented: 0
  });

  await documentStockMovementQuantity({
    database,
    partId: 1,
    quantity: 20,
    grnNo: 'GRN000002'
  });

  expect(movement).toMatchObject({
    quantity: 40,
    documented_quantity: 40,
    grn_documented: 1
  });
});

test('getLocalDate formats the local calendar date', () => {
  expect(getLocalDate(new Date(2026, 7, 5, 0, 30))).toBe('2026-08-05');
});
