import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { Show } from './index';

export type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  Signup: undefined;
  EmailVerification: {
    email: string;
  };
  SeatSelection: {
    showId: string;
    show: Show;
  };
  PaymentWebView: {
    checkoutUrl: string;
    showId: string;
    reservationId: string;
  };
  PaymentSuccess: {
    sessionId?: string; // Make optional for URL param handling
  };
  PaymentCancel: {
    showId?: string; // Make optional for URL param handling
  };
  Tickets: undefined;
  Account: undefined;
};

// Navigation prop types for each screen
export type HomeScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, 'Home'>;
  route: RouteProp<RootStackParamList, 'Home'>;
};

export type LoginScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, 'Login'>;
  route: RouteProp<RootStackParamList, 'Login'>;
};

export type SignupScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, 'Signup'>;
  route: RouteProp<RootStackParamList, 'Signup'>;
};

export type EmailVerificationScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, 'EmailVerification'>;
  route: RouteProp<RootStackParamList, 'EmailVerification'>;
};

export type SeatSelectionScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, 'SeatSelection'>;
  route: RouteProp<RootStackParamList, 'SeatSelection'>;
};

export type PaymentWebViewScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, 'PaymentWebView'>;
  route: RouteProp<RootStackParamList, 'PaymentWebView'>;
};

export type PaymentSuccessScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, 'PaymentSuccess'>;
  route: RouteProp<RootStackParamList, 'PaymentSuccess'>;
};

export type PaymentCancelScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, 'PaymentCancel'>;
  route: RouteProp<RootStackParamList, 'PaymentCancel'>;
};

export type TicketsScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, 'Tickets'>;
  route: RouteProp<RootStackParamList, 'Tickets'>;
};

export type AccountScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, 'Account'>;
  route: RouteProp<RootStackParamList, 'Account'>;
}; 