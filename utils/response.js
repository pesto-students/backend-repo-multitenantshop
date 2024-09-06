const getSuccessResponse = (data) => {
  return {
    message: "Successful",
    data: Array.isArray(data) ? data : { ...data },
    status: 200,
    error: false,
  };
};

const getBadRequestResponse = (erroredMessage) => {
  return {
    message: erroredMessage,
    status: 400,
    error: true,
  };
};

const getServerErrorResponse = (erroredMessage) => {
  return {
    message: erroredMessage,
    status: 500,
    error: true,
  };
};

module.exports = {
  getSuccessResponse,
  getBadRequestResponse,
  getServerErrorResponse,
};
