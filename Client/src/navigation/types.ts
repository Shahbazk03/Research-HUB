export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainTabParamList = {
  HomeTab: undefined;
  RequestsTab: undefined;
  ProfileTab: undefined;
  AdminTab: undefined;
};

export type HomeStackParamList = {
  Home: undefined;
  CategoryList: { domainId: string; domainName: string };
  ServiceList: { categoryId: string; categoryName: string };
  ServiceDetail: { serviceId: string; serviceTitle: string };
  RequestForm: { serviceId: string; serviceName: string };
  RequestDetail: { requestId: string };
};

export type RequestsStackParamList = {
  MyRequests: undefined;
  RequestDetail: { requestId: string };
};

export type AdminStackParamList = {
  AdminRequests: undefined;
  AdminRequestDetail: { requestId: string };
};
