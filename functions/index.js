const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const Razorpay = require("razorpay");

// Access the secret keys using the new method for Gen 2
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
    // This object explicitly defines the settings for the Gen 2 function
    {
        // This is a list of trusted domains. Add your live domain here.
        cors: ["https://registration.ieeevbitsb.in", "http://127.0.0.1:5500"], 
        // This makes the secret keys available as environment variables
        secrets: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"],
    }, 
    async (request, response) => {
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
    }
);