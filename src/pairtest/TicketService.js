import TicketPaymentService from '../thirdparty/paymentgateway/TicketPaymentService.js';
import SeatReservationService from '../thirdparty/seatbooking/SeatReservationService.js';
import TicketTypeRequest from './lib/TicketTypeRequest.js';
import InvalidPurchaseException from './lib/InvalidPurchaseException.js';
import { TICKET_RULES, TICKET_TYPES, MAX_TICKETS_PER_PURCHASE } from './lib/ticketRules.js';

export default class TicketService {
  #paymentService;
  #seatReservationService;

  // Services can be injected for testing; defaults to the real ones
  constructor(
    paymentService = new TicketPaymentService(),
    seatReservationService = new SeatReservationService(),
  ) {
    this.#paymentService = paymentService;
    this.#seatReservationService = seatReservationService;
  }

  /**
   * Should only have private methods other than the one below.
   */

  purchaseTickets(accountId, ...ticketTypeRequests) {
    // throws InvalidPurchaseException
    this.#validateAccountId(accountId);
    const quantities = this.#validateAndCountTickets(ticketTypeRequests);
    this.#validateBusinessRules(quantities);

    // Only charge and reserve once everything is valid
    this.#paymentService.makePayment(accountId, this.#calculateTotalCost(quantities));
    this.#seatReservationService.reserveSeat(accountId, this.#calculateSeatsToReserve(quantities));
  }

  #validateAccountId(accountId) {
    if (!Number.isSafeInteger(accountId) || accountId <= 0) {
      throw new InvalidPurchaseException('Account ID must be a positive integer.', 'INVALID_ACCOUNT_ID');
    }
  }

  #validateAndCountTickets(ticketTypeRequests) {
    if (ticketTypeRequests.length === 0) {
      throw new InvalidPurchaseException('At least one ticket must be purchased.', 'NO_TICKETS_REQUESTED');
    }

    const quantities = Object.fromEntries(TICKET_TYPES.map((type) => [type, 0]));

    for (const request of ticketTypeRequests) {
      if (!(request instanceof TicketTypeRequest)) {
        throw new InvalidPurchaseException('Every request must be a TicketTypeRequest.', 'INVALID_TICKET_REQUEST');
      }

      // Type and integer count already checked by TicketTypeRequest
      const quantity = request.getNoOfTickets();
      if (quantity <= 0) {
        throw new InvalidPurchaseException('Ticket quantities must be positive.', 'INVALID_TICKET_QUANTITY');
      }

      quantities[request.getTicketType()] += quantity;
    }

    return quantities;
  }

  #validateBusinessRules(quantities) {
    const totalTickets = Object.values(quantities).reduce((total, count) => total + count, 0);
    if (totalTickets > MAX_TICKETS_PER_PURCHASE) {
      throw new InvalidPurchaseException(
        `A purchase can include at most ${MAX_TICKETS_PER_PURCHASE} tickets.`,
        'MAX_TICKETS_EXCEEDED',
      );
    }

    if (quantities.ADULT === 0) {
      throw new InvalidPurchaseException('At least one adult ticket is required.', 'NO_ADULT_TICKET');
    }

    // Each infant needs an adult's lap, so one adult cannot accompany two infants
    if (quantities.INFANT > quantities.ADULT) {
      throw new InvalidPurchaseException('Each infant must be accompanied by an adult.', 'TOO_MANY_INFANTS');
    }
  }

  #calculateTotalCost(quantities) {
    return TICKET_TYPES.reduce(
      (total, type) => total + quantities[type] * TICKET_RULES[type].price,
      0,
    );
  }

  #calculateSeatsToReserve(quantities) {
    return TICKET_TYPES.reduce(
      (seats, type) => seats + (TICKET_RULES[type].requiresSeat ? quantities[type] : 0),
      0,
    );
  }
}
