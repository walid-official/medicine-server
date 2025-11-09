export type DateFilter = "daily" | "weekly" | "monthly" | "yearly" | "custom";

export interface OrderFilters {
  filter?: DateFilter;
  start?: string;
  end?: string;
  orderId?: string;

  // Pagination + sorting
  page?: number;            
  limit?: number;              
  sortBy?: string;            
  sortOrder?: "asc" | "desc";  

  // Search
  customerName?: string;       
  medicineName?: string;       
}