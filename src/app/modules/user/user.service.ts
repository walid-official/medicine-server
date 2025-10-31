import { envVars } from "../../config/env";
import AppError from "../../errorHelpers/AppError";
import { IAuthProvider, IUser, Role } from "./user.interface";
import { User } from "./user.model";
import httpStatus from "http-status";
import bcryptjs from "bcryptjs";
import { JwtPayload } from "jsonwebtoken";


export const createUserService = async (payload: Partial<IUser>) => {
    const { email, password, ...rest } = payload;
    const isUserExist = await User.findOne({ email })

    if (isUserExist) {
        throw new AppError(httpStatus.BAD_REQUEST, "User Already Exist")
    }
    const hashedPassword = await bcryptjs.hash(password as string, Number(envVars.BCRYPT_SALT_ROUND))
    const authProvider: IAuthProvider = { provider: "credentials", providerId: email as string }

    const user = await User.create({
        email,
        password: hashedPassword,
        auths: [authProvider],
        ...rest
    })
    return user
}


export const updateUserService = async (userId: string, payload: Partial<IUser>, decodedToken: JwtPayload) => {

    if (decodedToken.role === Role.USER || decodedToken.role === Role.MANAGER) {
        if (userId !== decodedToken.userId) {
            throw new AppError(401, "You are not authorized")
        }
    }

    const ifUserExist = await User.findById(userId);

    if (!ifUserExist) {
        throw new AppError(httpStatus.NOT_FOUND, "User Not Found")
    }

    if (decodedToken.role === Role.ADMIN && ifUserExist.role === Role.SUPER_ADMIN) {
        throw new AppError(401, "You are not authorized")
    }

    if (payload.role) {
        if (decodedToken.role === Role.USER || decodedToken.role === Role.MANAGER) {
            throw new AppError(httpStatus.FORBIDDEN, "You are not authorized");
        }

        // if (payload.role === Role.SUPER_ADMIN && decodedToken.role === Role.ADMIN) {
        //     throw new AppError(httpStatus.FORBIDDEN, "You are not authorized");
        // }
    }

    if (payload.isActive || payload.isDeleted || payload.isVerified) {
        if (decodedToken.role === Role.USER || decodedToken.role === Role.MANAGER) {
            throw new AppError(httpStatus.FORBIDDEN, "You are not authorized");
        }
    }

    const newUpdatedUser = await User.findByIdAndUpdate(userId, payload, { new: true, runValidators: true })

    return newUpdatedUser
}

export const getLoggedInUserService = async (decodedToken: JwtPayload) => {
  if (!decodedToken || !decodedToken.userId) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Not authenticated")
  }

  const user = await User.findById(decodedToken.userId).select("-password")
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found")
  }

  return user
}
export const getLoggedInRoleService = async (decodedToken: JwtPayload) => {
  if (!decodedToken || !decodedToken.userId) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Not authenticated")
  }

  const user = await User.findById(decodedToken.userId).select("-password")
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found")
  }

  return user
}