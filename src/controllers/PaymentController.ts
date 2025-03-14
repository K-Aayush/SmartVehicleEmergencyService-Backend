import axios from "axios";
import { Request, Response } from "express";

export const khaltiPayment = async (req: Request, res: Response) => {
    try {
        const payload = req.body;
        const khaltiResponse = await axios.post(
          "https://dev.khalti.com/api/v2/epayment/initiate/",
          payload,
          {
            headers: {
              Authorization: `key ${process.env.KHALTI_SECRET_KEY}`,
            },
          }
        );
    
        if (khaltiResponse) {
            
          res.json({
            success: true,
            data: khaltiResponse?.data,
          });
        } else {
          res.json({
            success: false,
            message: "Something went wrong",
          });
        }
      } catch (error) {
        res.json({success: false, message: "Internal Server Error"})
      }
}