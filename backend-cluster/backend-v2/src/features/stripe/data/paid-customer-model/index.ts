export type {
  PaidCustomer,
  CreatePaidCustomerInput,
  UpdatePaidCustomerInput,
  IPaidCustomerModel,
} from "./types";

// Export PostgreSQL implementation
export { PaidCustomerPostgresModel } from "./postgres-impl";
export { paidCustomers } from "./schema";
