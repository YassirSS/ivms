import Accidents from "../models/Accidents";

// controllers/accidentController.js
export const getAccidentsByMonth = async (req, res) => {
  const { month } = req.query;
  const start = new Date(`${month}-01`);
  const end = new Date(new Date(start).setMonth(start.getMonth() + 1));

  const accidents = await Accidents.find({
    isActive: true,
    date: { $gte: start, $lt: end },
  })
    .populate("bus", "fleetNumber manufacturer")
    .populate("reportedBy", "name role");

  res.status(200).json({ success: true, data: accidents });
};
