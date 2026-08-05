import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import InvoicePrintHeader from './InvoicePrintHeader';

test('centers the invoice email without registration or brand images', () => {
  const markup = renderToStaticMarkup(<InvoicePrintHeader />);

  expect(markup).toContain('E-mail: euautoparts@gmail.com');
  expect(markup).toContain('text-align:center');
  expect(markup).not.toContain('Reg No.');
  expect(markup).not.toContain('<img');
  expect(markup).not.toContain('Volkswagen');
  expect(markup).not.toContain('Audi');
  expect(markup).not.toContain('Seat');
  expect(markup).not.toContain('Skoda');
});
