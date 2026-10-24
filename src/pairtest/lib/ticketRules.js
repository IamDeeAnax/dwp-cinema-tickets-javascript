/** Single source of truth for ticket types, prices (in whole pounds) and seating. */
export const TICKET_RULES = Object.freeze({
  INFANT: Object.freeze({ price: 0, requiresSeat: false }),
  CHILD: Object.freeze({ price: 15, requiresSeat: true }),
  ADULT: Object.freeze({ price: 25, requiresSeat: true }),
});

export const TICKET_TYPES = Object.freeze(Object.keys(TICKET_RULES));

export const MAX_TICKETS_PER_PURCHASE = 25;
