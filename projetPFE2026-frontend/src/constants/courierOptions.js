export const REGION_OPTIONS = [
  "Ariana",
  "Beja",
  "Ben Arous",
  "Bizerte",
  "Gabes",
  "Gafsa",
  "Jendouba",
  "Kairouan",
  "Kasserine",
  "Kebili",
  "Kef",
  "Mahdia",
  "Manouba",
  "Medenine",
  "Monastir",
  "Nabeul",
  "Sfax",
  "Sidi Bouzid",
  "Siliana",
  "Sousse",
  "Tataouine",
  "Tozeur",
  "Tunis",
  "Zaghouan",
];

export const COURIER_STATUS_OPTIONS = [
  {
    value: "active",
    label: "Actif",
    color: "#2ccb76",
    bg: "rgba(44,203,118,.12)",
    border: "rgba(44,203,118,.35)",
  },
  {
    value: "temporary_leave",
    label: "Conge temporaire",
    color: "#f59e0b",
    bg: "rgba(245,158,11,.12)",
    border: "rgba(245,158,11,.35)",
  },
  {
    value: "contract_ended",
    label: "Contrat termine",
    color: "#ff5f5f",
    bg: "rgba(255,95,95,.12)",
    border: "rgba(255,95,95,.35)",
  },
];

export function getCourierStatusMeta(status) {
  return (
    COURIER_STATUS_OPTIONS.find((option) => option.value === status) || {
      value: "active",
      label: "Actif",
      color: "#2ccb76",
      bg: "rgba(44,203,118,.12)",
      border: "rgba(44,203,118,.35)",
    }
  );
}
