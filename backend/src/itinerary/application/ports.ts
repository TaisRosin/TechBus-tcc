export interface StopOrder {
  groupId: string;
  version: number;
  stopIds: string[];
}
export interface Publication {
  date: string;
  groupId: string;
  version: number;
  planVersion: number;
  orderVersion: number;
  stopIds: string[];
  sourceToken: string;
  publishedBy: string;
  publishedAt: Date;
}
export interface ItineraryTransaction {
  order(groupId: string): Promise<StopOrder | null>;
  saveOrder(order: StopOrder): Promise<void>;
  publication(date: string, groupId: string): Promise<Publication | null>;
  savePublication(publication: Publication): Promise<void>;
}
