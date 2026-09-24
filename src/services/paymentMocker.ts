class MockPayment {
    async checkout(user: string, fail : boolean = false) {
        if(fail) {
            await new Promise(resolve => setTimeout(resolve, 11000));
            throw new Error("Payment failed");
        }
        return {status: "success", user};
    }
}

export const mockPayment = new MockPayment();