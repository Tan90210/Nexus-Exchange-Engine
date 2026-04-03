const errorHandler = (err, req, res, next) => {
    console.error(err);
    const status = err.status || 500;
    if (err.payload) {
        return res.status(status).json(err.payload);
    }

    res.status(status).json({ error: err.message || 'Internal server error' });
};

export default errorHandler;
