import { parseEther } from "viem";

try {
    console.log("0.0001:", parseEther("0.0001").toString());
    console.log("1e-18:", parseEther((1e-18).toString()).toString());
} catch (e) {
    console.error("1e-18 failed:", e.message);
}

try {
    const huge = 1000000000.0000001;
    console.log("Huge:", parseEther(huge.toString()).toString());
} catch (e) {
    console.error("Huge failed:", e.message);
}
