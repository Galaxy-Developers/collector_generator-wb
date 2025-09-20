class {{errorClass}} extends Error {
    constructor(message, code = '{{defaultCode}}', statusCode = 500, details = null) {
        super(message);
        this.name = '{{errorClass}}';
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
        this.timestamp = new Date().toISOString();
    }

    toJSON() {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            statusCode: this.statusCode,
            details: this.details,
            timestamp: this.timestamp
        };
    }
}

export default {{errorClass}};