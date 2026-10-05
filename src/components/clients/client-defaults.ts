export type ClientFormData = {
  id?: string;
  name: string;
  industry: string;
  website: string;
  city: string;
  state: string;
  address: string;
  gstin: string;
  status: string;
  fee_type: string;
  fee_value: string;
  payment_terms_days: string;
  replacement_days: string;
  agreement_start: string;
  agreement_end: string;
  account_manager: string;
  notes: string;
  contacts: { id?: string; name: string; designation: string; email: string; phone: string; is_primary: boolean }[];
};

export const emptyClient = (): ClientFormData => ({
  name: "",
  industry: "",
  website: "",
  city: "",
  state: "",
  address: "",
  gstin: "",
  status: "Active",
  fee_type: "Percentage",
  fee_value: "8.33",
  payment_terms_days: "30",
  replacement_days: "90",
  agreement_start: "",
  agreement_end: "",
  account_manager: "",
  notes: "",
  contacts: [{ name: "", designation: "", email: "", phone: "", is_primary: true }],
});

