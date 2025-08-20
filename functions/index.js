const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const Razorpay = require("razorpay");
const cors = require("cors")({origin: true}); // Initialize CORS middleware

// This part is important - it accesses the keys set by the command line
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

let razorpay;
if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
    razorpay = new Razorpay({
        key_id: RAZORPAY_KEY_ID,
        key_secret: RAZORPAY_KEY_SECRET,
    });
}

exports.createOrder = onRequest(
    // NOTE: The {cors: true} option in v2 is often not enough for POST requests
    // with a body. Using the middleware is more robust.
    async (request, response) => {
        // =========== CRITICAL FIX START ===========
        // Wrap the entire function logic within the cors handler
        cors(request, response, async () => {
            if (!razorpay) {
                logger.error("Razorpay keys are not configured. Function cannot proceed.");
                response.status(500).send("Server configuration error.");
                return;
            }

            try {
                const amount = request.body.amount * 100;
                const currency = "INR";
                
                const options = {
                    amount,
                    currency,
                    receipt: `receipt_${new Date().getTime()}`,
                };

                const order = await razorpay.orders.create(options);
                logger.info("Order created successfully:", order);
                response.status(200).json(order);

            } catch (error) {
                logger.error("Error creating Razorpay order:", error);
                response.status(500).send("Error creating order");
            }
        });
        // =========== CRITICAL FIX END ===========
    }
);