export interface LookupTablesConfig {
    url: string;
  }
  
  export interface ILookupOption {
    value: string;
    translationCode: string;
    properties?: Record<string, unknown>;
  }
  