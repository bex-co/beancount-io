// Logout and deployment changes invalidate an exchange already in flight.
let generation = 0;
export const authorizationGeneration = () => generation;
export const invalidateAuthorization = () => {
  generation += 1;
};
