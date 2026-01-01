export type DateFilter = "daily" | "weekly" | "monthly" | "yearly" | "custom";

export interface InventoryFilters {
  filter?: DateFilter;
  start?: string;
  end?: string;
  medicineId?: string;
  medicineName?: string;
  category?: string;
  
  // Pagination + sorting
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

