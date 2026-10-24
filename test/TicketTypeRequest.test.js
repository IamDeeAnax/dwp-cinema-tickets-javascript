import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { inspect } from 'node:util';
import TicketTypeRequest from '../src/pairtest/lib/TicketTypeRequest.js';

describe('TicketTypeRequest', () => {
  test('stores the ticket type and count', () => {
    const ticketRequest = new TicketTypeRequest('ADULT', 2);
    assert.equal(ticketRequest.getTicketType(), 'ADULT');
    assert.equal(ticketRequest.getNoOfTickets(), 2);
  });

  for (const type of ['PENSIONER', 'adult', '', null, undefined]) {
    test(`rejects ticket type ${inspect(type)}`, () => {
      assert.throws(() => new TicketTypeRequest(type, 1), TypeError);
    });
  }

  for (const count of [1.5, '2', NaN, Infinity, null]) {
    test(`rejects ticket count ${inspect(count)}`, () => {
      assert.throws(() => new TicketTypeRequest('ADULT', count), TypeError);
    });
  }

  test('cannot be modified after creation', () => {
    const ticketRequest = new TicketTypeRequest('CHILD', 3);
    assert.throws(() => { ticketRequest.getNoOfTickets = () => 100; }, TypeError);
    assert.equal(ticketRequest.getNoOfTickets(), 3);
  });
});
