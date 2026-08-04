import { getLocalDate, saveDailyStockReceive } from './stockReceiveService';

const createPart = (id, finalValue) => ({
  id,
  pro_no: `PRO-${id}`,
  item_description: `Part ${id}`,
  unit_price: finalValue,
  rec_qty: 1,
  item_value: finalValue,
  dis_percent: 0,
  discount_value: 0,
  final_value: finalValue
});

describe('saveDailyStockReceive', () => {
  test('appends any number of items to the existing GRN for the receive date', async () => {
    const calls = [];
    const database = {
      query: jest.fn(async (type, sql, params) => {
        calls.push({ type, sql, params });
        if (type === 'get' && sql.includes('FROM stock_receives')) {
          return {
            id: 7,
            grn_no: 'GRN000007',
            sup_ref: 'REF-1',
            supplier_name: 'Supplier A',
            lot_name: '',
            remarks: ''
          };
        }
        return { changes: 1 };
      })
    };
    const generateNewGRNNo = jest.fn();

    const result = await saveDailyStockReceive({
      database,
      formData: {
        rec_date: '2026-08-05',
        sup_ref: 'REF-2',
        supplier_name: 'Supplier B',
        lot_name: 'Lot B',
        remarks: 'Second delivery'
      },
      selectedParts: [createPart(10, 100), createPart(11, 250)],
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
    expect(calls.filter(call => call.sql.includes('UPDATE stock_movements'))).toHaveLength(2);

    const headerUpdate = calls.find(call => call.sql.includes('SET sup_ref = ?'));
    expect(headerUpdate.params).toEqual([
      'REF-1; REF-2',
      'Supplier A; Supplier B',
      'Lot B',
      'Second delivery',
      7
    ]);
    expect(calls.some(call => call.sql.includes('SELECT SUM(final_value)'))).toBe(true);
  });

  test('creates the only GRN header when the receive date has no GRN', async () => {
    const calls = [];
    const database = {
      query: jest.fn(async (type, sql, params) => {
        calls.push({ type, sql, params });
        if (type === 'get') return null;
        if (sql.includes('INSERT INTO stock_receives')) return { lastInsertRowid: 9 };
        return { changes: 1 };
      })
    };

    const result = await saveDailyStockReceive({
      database,
      formData: {
        rec_date: '2026-08-06',
        sup_ref: '',
        supplier_name: 'Supplier A',
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

test('getLocalDate formats the local calendar date', () => {
  expect(getLocalDate(new Date(2026, 7, 5, 0, 30))).toBe('2026-08-05');
});
