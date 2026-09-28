// Augments Express's Request with the correlation id RequestIdMiddleware
// attaches to every request.
declare namespace Express {
  interface Request {
    id?: string;
  }
}
