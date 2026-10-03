import type { Database } from "./database.types";
export type { Database, Json } from "./database.types";

export type PublicSchema = Database["public"];
export type PublicTableName = keyof PublicSchema["Tables"];
export type TableRow<T extends PublicTableName> = PublicSchema["Tables"][T]["Row"];
export type TableInsert<T extends PublicTableName> = PublicSchema["Tables"][T]["Insert"];
export type TableUpdate<T extends PublicTableName> = PublicSchema["Tables"][T]["Update"];
