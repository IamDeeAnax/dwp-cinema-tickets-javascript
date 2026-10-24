import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { inspect } from 'node:util';

import TicketService from '../src/pairtest/TicketService.js';
import TicketTypeRequest from '../src/pairtest/lib/TicketTypeRequest.js';

const request = (type, count) => new TicketTypeRequest(type, count);

function createService() {
  const payments = [];
  const reservations = [];
  const paymentGateway = {
    makePayment: (accountId, amount) => payments.push({ accountId, amount }),
  };
  const seatBooking = {
    reserveSeat: (accountId, seats) => reservations.push({ accountId, seats }),
  };
  return {
    service: new TicketService(paymentGateway, seatBooking),
    payments,
    reservations,
  };
}

function assertPurchase(accountId, requests, { amount, seats }) {
  const { service, payments, reservations } = createService();
  service.purchaseTickets(accountId, ...requests);
  assert.deepEqual(payments, [{ accountId, amount }]);
  assert.deepEqual(reservations, [{ accountId, seats }]);
}

function assertRejected(code, accountId, ...requests) {
  const { service, payments, reservations } = createService();
  assert.throws(
    () => service.purchaseTickets(accountId, ...requests),
    { name: 'InvalidPurchaseException', code },
  );
  assert.deepEqual(payments, [], 'no payment should be taken');
  assert.deepEqual(reservations, [], 'no seats should be reserved');
}

describe('TicketService valid purchases', () => {
  test('single adult costs £25 and reserves one seat', () => {
    assertPurchase(17, [request('ADULT', 1)], { amount: 25, seats: 1 });
  });

  test('adult and child cost £40 and reserve two seats', () => {
    assertPurchase(5, [request('ADULT', 1), request('CHILD', 1)], { amount: 40, seats: 2 });
  });

  test('infants are free and are not allocated a seat', () => {
    assertPurchase(1, [request('ADULT', 1), request('INFANT', 1)], { amount: 25, seats: 1 });
  });

  test('mixed purchase charges adults and children only', () => {
    assertPurchase(27, [request('ADULT', 2), request('CHILD', 3), request('INFANT', 2)],
      { amount: 95, seats: 5 });
  });

  test('repeated ticket types are accumulated', () => {
    assertPurchase(3, [request('ADULT', 1), request('CHILD', 2), request('ADULT', 1)],
      { amount: 80, seats: 4 });
  });

  test('exactly 25 tickets are accepted, including infants', () => {
    assertPurchase(3, [request('ADULT', 13), request('INFANT', 12)], { amount: 325, seats: 13 });
  });

  test('works with the real third-party services by default', () => {
    assert.doesNotThrow(() => new TicketService().purchaseTickets(1, request('ADULT', 1)));
  });
});

describe('TicketService account validation', () => {
  const invalidAccountIds = [0, -1, 1.5, '1', null, undefined, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1];

  for (const accountId of invalidAccountIds) {
    test(`rejects account ID ${inspect(accountId)}`, () => {
      assertRejected('INVALID_ACCOUNT_ID', accountId, request('ADULT', 1));
    });
  }
});

describe('TicketService request validation', () => {
  test('rejects a purchase with no ticket requests', () => {
    assertRejected('NO_TICKETS_REQUESTED', 1);
  });

  const malformedRequests = {
    null: null,
    undefined: undefined,
    'empty object': {},
    'duck-typed object': { getTicketType: () => 'ADULT', getNoOfTickets: () => 1 },
    'array of requests': [request('ADULT', 1)],
  };

  for (const [name, malformed] of Object.entries(malformedRequests)) {
    test(`rejects ${name} as a ticket request`, () => {
      assertRejected('INVALID_TICKET_REQUEST', 1, malformed);
    });
  }

  for (const count of [0, -1]) {
    test(`rejects a quantity of ${count}`, () => {
      assertRejected('INVALID_TICKET_QUANTITY', 1, request('ADULT', count));
      assertRejected('INVALID_TICKET_QUANTITY', 1, request('ADULT', 1), request('CHILD', count));
    });
  }

  test('rejects a malformed request after a valid one', () => {
    assertRejected('INVALID_TICKET_REQUEST', 1, request('ADULT', 2), null);
  });
});

describe('TicketService business rules', () => {
  test('rejects more than 25 tickets of a single type', () => {
    assertRejected('MAX_TICKETS_EXCEEDED', 1, request('ADULT', 26));
  });

  test('the 25-ticket limit applies across repeated types', () => {
    assertRejected('MAX_TICKETS_EXCEEDED', 1, request('ADULT', 13), request('ADULT', 13));
  });

  test('the 25-ticket limit includes children and infants', () => {
    assertRejected('MAX_TICKETS_EXCEEDED', 1, request('ADULT', 1), request('CHILD', 25));
    assertRejected('MAX_TICKETS_EXCEEDED', 1, request('ADULT', 13), request('INFANT', 13));
  });

  test('rejects child tickets without an adult', () => {
    assertRejected('NO_ADULT_TICKET', 1, request('CHILD', 1));
  });

  test('rejects infant tickets without an adult', () => {
    assertRejected('NO_ADULT_TICKET', 1, request('INFANT', 1));
    assertRejected('NO_ADULT_TICKET', 1, request('CHILD', 2), request('INFANT', 1));
  });

  test('rejects more infants than adults', () => {
    assertRejected('TOO_MANY_INFANTS', 1, request('ADULT', 1), request('INFANT', 2));
    assertRejected('TOO_MANY_INFANTS', 1, request('ADULT', 1), request('ADULT', 1), request('INFANT', 3));
  });
});