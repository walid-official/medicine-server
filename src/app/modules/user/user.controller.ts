import { catchAsync } from "../../utils/catchAsync"
import { sendResponse } from "../../utils/sendResponse"
import { createUserService, getLoggedInRoleService, getLoggedInUserService, updateUserService } from "./user.service"
import httpStatus from "http-status"
import { Request, Response, NextFunction } from "express"
import { JwtPayload } from "jsonwebtoken"

export const createUserController = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    
    const user = await createUserService(req.body)

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.CREATED,
        message: "User Created Successfully",
        data: user,
    })
})


export const updateUserController = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.params.id;
    // const token = req.headers.authorization
    // const verifiedToken = verifyToken(token as string, envVars.JWT_ACCESS_SECRET) as JwtPayload

    const verifiedToken = req.user;

    const payload = req.body;
    const user = await updateUserService(userId, payload, verifiedToken as JwtPayload)

    // res.status(httpStatus.CREATED).json({
    //     message: "User Created Successfully",
    //     user
    // })

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.CREATED,
        message: "User Updated Successfully",
        data: user,
    })
})

export const getLoggedInUser = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const decodedToken = req.user as JwtPayload | undefined

    if (!decodedToken) {
       res.status(httpStatus.UNAUTHORIZED).json({
        success: false,
        message: "Unauthorized. No user found in request.",
      })
      return;
    }
 const user = await getLoggedInRoleService(decodedToken)
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Logged in user retrieved successfully",
    data: user,
  })
})
export const getLoggedInRoleUser = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
 const decodedToken = req.user as JwtPayload | undefined

    if (!decodedToken) {
       res.status(httpStatus.UNAUTHORIZED).json({
        success: false,
        message: "Unauthorized. No user found in request.",
      })
      return;
    }

    const user = await getLoggedInRoleService(decodedToken)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Logged in user retrieved successfully",
    data: user?.role,
  })
})

