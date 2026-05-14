import { api } from "./client.js";

const generateAI = async () => {
  const res = await api.post(
    "/admin/tournees/generate-ai",
    {},
    { timeout: 300000 }
  );
  return res.data;
};

const getAll = async () => {
  const res = await api.get("/admin/tournees/");
  return res.data;
};

const getRestants = async () => {
  const res = await api.get("/admin/tournees/restants");
  return res.data;
};

const accept = async (id) => {
  const res = await api.post(`/admin/tournees/${id}/accept`);
  return res.data;
};

const refuse = async (id) => {
  const res = await api.post(`/admin/tournees/${id}/refuse`);
  return res.data;
};

const getAccepted = async () => {
  const res = await api.get("/admin/tournees/accepted");
  return res.data;
};


export default {
  generateAI,
  getAll,
  getRestants,
  accept,
  refuse,
  getAccepted,
};