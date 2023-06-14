import User from "../models/userModel";
import jwt from "jsonwebtoken";
import { promisify } from "util";

const signToken = (id, secret, expiresIn) => {
  return jwt.sign(
    {
      id,
    },
    secret,
    {
      expiresIn,
    }
  );
};

const test = (req, res, next) => {
  res.status(200).json({
    status: "success",
    message: "Hello from the server!",
  });
};

const register = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({
      status: "Error",
      message: "Incomplete credentials",
    });

  // check if this email has been taken
  const existingUser = await User.findOne({ email });

  if (existingUser)
    return res.status(400).json({
      status: "Error",
      message: "A user exists with this email",
    });

  try {
    // const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = await User.create({
      email,
      password,
    });

    return res.status(201).json({
      status: "Success",
      newUser,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: "Error",
      message: "An error occurred!",
    });
  }
};

const login = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({
      status: "Error",
      message: "Incomplete credentials",
    });

  const user = await User.findOne({ email }).select("+password");

  // check if password is correct: see userModel for the method correctPassword
  if (!user || !(await user.correctPassword(password, user.password)))
    return res.status(400).json({
      status: "Error",
      message: "Email or password is incorrect",
    });

  // create tokens and send to the user

  const accessToken = signToken(user._id, process.env.JWT_ACCESS_SECRET, "5m");
  const refreshToken = signToken(
    user._id,
    process.env.JWT_REFRESH_SECRET,
    "1y"
  );

  const cookieOptions = {
    httpOnly: true,
    path: "/",
    secure: process.env.NODE_ENV === "development" ? false : true,
  };

  // access token in 5 mins and refresh in 1 year
  res.cookie("access-token", accessToken, {
    ...cookieOptions,
    maxAge: 5 * 60 * 1000,
  });

  res.cookie("refresh-token", refreshToken, {
    ...cookieOptions,
    maxAge: 365 * 24 * 60 * 60 * 1000,
  });

  await User.findByIdAndUpdate(user._id, {
    refreshToken,
  });

  res.status(200).json({
    status: "Success",
    accessToken,
    refreshToken,
  });
};

const protect = async (req, res, next) => {
  const accessToken = req.cookies["access-token"];
  const refreshToken = req.cookies["refresh-token"];

  if (!refreshToken)
    return res.status(401).json({
      status: "Error",
      message: "Unauthorized",
    });

  const handleDecoded = async (decoded) => {
    const user = await User.findOne({ _id: decoded.id })
      .select("+refreshToken")
      .lean();

    if (!user)
      return res.status(400).json({
        status: "Error",
        message: "Unauthorized",
      });

    if (!user.refreshToken === refreshToken)
      return res.status(400).json({
        status: "Error",
        message: "Unauthorized",
      });

    //  check if user is suspended, active, deleted, if user changed password after this token was issued (decoded.iat)  etc....

    return (({ refreshToken, ...rest }) => rest)(user);
  };

  try {
    const decoded = await promisify(jwt.verify)(
      accessToken,
      process.env.JWT_ACCESS_SECRET
    );

    const currentUser = await handleDecoded(decoded);

    req.user = currentUser;
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      (error.name === "TokenExpiredError" && refreshToken)
    ) {
      try {
        const decoded = await promisify(jwt.verify)(
          refreshToken,
          process.env.JWT_REFRESH_SECRET
        );

        const currentUser = await handleDecoded(decoded);

        const accessToken = signToken(
          currentUser._id,
          process.env.JWT_ACCESS_SECRET,
          "5m"
        );

        res.cookie("access-token", accessToken, {
          httpOnly: true,
          path: "/",
          secure: process.env.NODE_ENV === "development" ? false : true,
          maxAge: 5 * 60 * 1000,
        });
        req.user = currentUser;
      } catch (error) {
        console.log(error);
        return res.status(400).json({
          status: "Error",
          message: "Unauthorized",
        });
      }
    }
  }
  next();
};

const session = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({
      status: "Error",
      message: "Unauthorized!",
    });
  }

  return res.status(200).json({
    status: "Success",
    user: req.user,
  });
};

export default { test, register, login, session, protect };
