import { useState } from "react";
import { useSearch } from "@tanstack/react-router";
import RegisterPage from "./register";
import SignUpOtpPage from "./register-otp";

type RegistrationStep = "register" | "otp";

type RegistrationData = {
  sessionId: string;
  email: string;
};

/**
 * Parent component that manages the registration flow
 * Handles state-based page switching between registration form and OTP verification
 */
export default function RegisterFlow() {
  const search = useSearch({ from: "/auth/sign-up" });
  const [step, setStep] = useState<RegistrationStep>("register");
  const [registrationData, setRegistrationData] =
    useState<RegistrationData | null>(null);

  // Handle successful registration form submission
  const handleRegisterSuccess = (sessionId: string, email: string) => {
    setRegistrationData({ sessionId, email });
    setStep("otp");
  };

  // Handle successful OTP verification
  const handleOtpSuccess = () => {
    // Navigation to welcome page will be handled by SignUpOtpPage
    // This component just manages the flow state
  };

  // Handle going back to registration form
  const handleBackToRegister = () => {
    setStep("register");
    setRegistrationData(null);
  };

  if (step === "otp" && registrationData) {
    return (
      <SignUpOtpPage
        sessionId={registrationData.sessionId}
        email={registrationData.email}
        onSuccess={handleOtpSuccess}
        onBack={handleBackToRegister}
      />
    );
  }

  return (
    <RegisterPage
      withDefaultLedger={search.withDefaultLedger ?? false}
      inviteSrc={search.src}
      inviteBy={search.by}
      onSuccess={handleRegisterSuccess}
    />
  );
}
