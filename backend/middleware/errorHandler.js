// Small helpers + the one place where errors become JSON responses.

// Create an error that carries an HTTP status code.
function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

function notFound(message) {
  const err = new Error(message);
  err.status = 404;
  return err;
}

// true for undefined, null, "" and "   "
function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === "";
}

// true for real numbers only (not "", not "abc")
function isNumber(value) {
  return !isBlank(value) && !isNaN(Number(value));
}

// Wraps an async controller so any error is passed to errorHandler
// (this saves us from writing try/catch in every function).
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Express recognises an error handler by its 4 parameters.
function errorHandler(err, req, res, next) {
  let status = err.status || 500;
  let message = err.message;

  if (err.name === "CastError") {
    status = 400;
    message = "Invalid ID format";
  } else if (err.name === "ValidationError") {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join(", ");
  } else if (!err.status) {
    console.error(err); // full error only in the server log
    status = 500;
    message = "Something went wrong on the server"; // never leak raw MongoDB errors
  }

  res.status(status).json({ success: false, message });
}

module.exports = { errorHandler, asyncHandler, badRequest, notFound, isBlank, isNumber };
