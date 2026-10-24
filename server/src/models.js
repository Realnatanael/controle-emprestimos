import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: "app", unique: true },
    cashOnHand: { type: Number, default: 0 },
    defaultInterestPercent: { type: Number, default: 10 },
    defaultLateFeePerDay: { type: Number, default: 0 },
    interestMode: { type: String, enum: ["mensal", "fixo"], default: "mensal" },
    yellowDays: { type: Number, default: 7 },
    redDays: { type: Number, default: 2 },
  },
  { timestamps: true },
);

const loanSchema = new mongoose.Schema(
  {
    clientName: { type: String, required: true, trim: true },
    principal: { type: Number, required: true },
    interestPercent: { type: Number, required: true },
    lateFeePerDay: { type: Number, default: 0 },
    interestMode: { type: String, enum: ["mensal", "fixo"], required: true },
    startDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    note: { type: String, default: "" },
    deductedFromCash: { type: Boolean, default: true },
    status: { type: String, enum: ["aberto", "pago"], default: "aberto" },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true },
);

loanSchema.index({ status: 1, dueDate: 1 });

export const Settings = mongoose.model("Settings", settingsSchema);
export const Loan = mongoose.model("Loan", loanSchema);

export function getSettings() {
  return Settings.findOneAndUpdate(
    { key: "app" },
    { $setOnInsert: { key: "app" } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}
