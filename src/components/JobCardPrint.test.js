import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import JobCardPrint from './JobCardPrint';

test('prints only estimate rows and leaves the manual total empty', () => {
  const markup = renderToStaticMarkup(
    <JobCardPrint
      jobData={{}}
      selectedParts={[
        {
          source_type: 'estimate',
          type: 'WHEEL ALIGNMENT',
          description: 'Inspect and adjust',
          quantity: 1
        },
        {
          source_type: 'invoice',
          part_name: 'test5',
          part_number: 'test5',
          amount: 4559998.86
        }
      ]}
    />
  );

  expect(markup).toContain('186/3, Kaolin refinery, Road, Werahera, Boralesgamuwa Sri Lanka');
  expect(markup).toContain('Tel: 070 633 3555');
  expect(markup).toContain('E-mail: vishwa.motors@yahoo.com');
  expect(markup).not.toContain('PV No.');
  expect(markup).toContain('WHEEL ALIGNMENT - Inspect and adjust');
  expect(markup).not.toContain('test5');
  expect(markup).not.toContain('Rs.');
  expect(markup).not.toContain('AUDI');
  expect(markup).not.toContain('BMW');
  expect(markup).not.toContain('SKODA');
});
