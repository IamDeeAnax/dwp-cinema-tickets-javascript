import { TICKET_TYPES } from './ticketRules.js';

/**
 * Immutable Object.
 */

export default class TicketTypeRequest {
  #type;

  #noOfTickets;

  constructor(type, noOfTickets) {
    if (!TICKET_TYPES.includes(type)) {
      throw new TypeError(`type must be one of: ${TICKET_TYPES.join(', ')}`);
    }

    if (!Number.isInteger(noOfTickets)) {
      throw new TypeError('noOfTickets must be an integer');
    }

    this.#type = type;
    this.#noOfTickets = noOfTickets;
    Object.freeze(this);
  }

  getNoOfTickets() {
    return this.#noOfTickets;
  }

  getTicketType() {
    return this.#type;
  }
}
