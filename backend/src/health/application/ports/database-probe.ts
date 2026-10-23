export interface DatabaseProbe {
  check(): Promise<boolean>;
}
