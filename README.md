# Cinema Tickets – JavaScript

## Overview

My solution to the DWP Software Engineer cinema tickets coding exercise, written in JavaScript.

`TicketService` takes an account ID and one or more ticket requests. It rejects any request that breaks the business rules, then charges the correct amount through `TicketPaymentService` and reserves the correct number of seats through `SeatReservationService`.

The supplied `TicketService` interface and third-party code are unchanged.

## Business rules

Prices and seating are defined once in `src/pairtest/lib/ticketRules.js`:

| Ticket | Price | Needs a seat |
|---|---|---|
| Infant | £0 | No (sits on an adult's lap) |
| Child | £15 | Yes |
| Adult | £25 | Yes |

For example, 2 adults, 3 children and 1 infant cost £95 and need 5 seats.

A purchase is rejected with an `InvalidPurchaseException`. Each rule has a fixed `code`, so callers can handle errors without relying on the message text:

| Rejected when | `code` |
|---|---|
| the account ID is not a positive integer | `INVALID_ACCOUNT_ID` |
| no tickets are requested | `NO_TICKETS_REQUESTED` |
| a request is not a `TicketTypeRequest` | `INVALID_TICKET_REQUEST` |
| any ticket quantity is zero or negative | `INVALID_TICKET_QUANTITY` |
| more than 25 tickets are requested in total (infants included) | `MAX_TICKETS_EXCEEDED` |
| there is no adult ticket | `NO_ADULT_TICKET` |
| there are more infants than adults (see Assumptions) | `TOO_MANY_INFANTS` |

Nothing is charged or reserved for a rejected purchase.

`TicketTypeRequest` itself throws a `TypeError` for an unknown ticket type or a non-integer count, as the supplied code already did.

## Approach

- `purchaseTickets` is the only public method. It validates the request, then calls private methods to work out the cost and seats.
- All validation happens before the payment or seat reservation services are called.
- `TicketTypeRequest` is immutable (private fields and `Object.freeze`).
- The payment and seat services can be passed into the `TicketService` constructor for testing. By default it uses the real ones.

## Assumptions

- **One infant per adult.** Infants sit on an adult's lap, so I've assumed each adult can only take one infant. The exercise doesn't state a ratio; if more are allowed, remove the check in `#validateBusinessRules` and its test.
- Infants count towards the 25-ticket limit, as they are still tickets.
- Account IDs must be safe integers, so large IDs can't be rounded to a different account.
- The exercise states that payments and seat reservations always succeed, so the code doesn't handle either call failing (for example, refunding a payment if the seats can't be reserved).
- Every ticket request must be for at least one ticket. A request for 0 is rejected rather than ignored, as it doesn't buy anything.

## Testing

### Running the tests

1. Check you have Node.js 20.9 or later:
   ```sh
   node --version
   ```
2. From the `dwp-cinema-tickets-javascript` folder, run:
   ```sh
   npm test
   ```
   No dependencies to install.
3. You should see all 43 tests pass:
   ```
   ℹ tests 43
   ℹ pass 43
   ℹ fail 0
   ```

To run a single test file:
```sh
node --test test/TicketService.test.js
```

### What the tests cover

**`test/TicketTypeRequest.test.js` (12 tests)**
- valid requests store their type and count
- unknown or wrongly cased ticket types are rejected
- non-integer counts are rejected (decimals, strings, `NaN`, `Infinity`, `null`)
- a request cannot be changed after it is created

**`test/TicketService.test.js` (31 tests)**
- *Valid purchases:* correct price and seats for adults, children and infants; repeated ticket types are added together; exactly 25 tickets is allowed; works with the real third-party services
- *Account validation:* zero, negative, decimal, string, missing, `NaN`, `Infinity` and unsafe account IDs
- *Request validation:* no requests, malformed requests, zero and negative quantities
- *Business rules:* the 25-ticket limit (including infants and repeated types), no adult, more infants than adults

Every rejection test checks the error `code`, and that no payment or seat reservation was made.
