import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, User, Briefcase, Building2 } from "lucide-react";
import { authAPI } from "../utils/api";
import LightRays from "../components/LightRays";
import "../styles/LoginSignup.css";

const Signup = () => {
    const navigate = useNavigate();
    const [isSignup, setIsSignup] = useState(true); // Default to true for Signup page
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        confirmPassword: "",
        name: "",
        role: "customer",
        companyName: "",
    });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError("");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            if (isSignup) {
                if (formData.password !== formData.confirmPassword) {
                    throw new Error("Passwords do not match");
                }
                if (formData.password.length < 6) {
                    throw new Error("Password must be at least 6 characters");
                }
                const { data } = await authAPI.signup(formData);
                if (data?.token) {
                    localStorage.setItem("token", data.token);
                    localStorage.setItem("user", JSON.stringify(data.user));
                    if (data.user.role === "admin") navigate("/admin/dashboard");
                    else navigate("/shop");
                } else {
                    setIsSignup(false);
                    alert("Signup successful! Please login.");
                }
            } else {
                const { data } = await authAPI.login(formData.email, formData.password);
                localStorage.setItem("token", data.token);
                localStorage.setItem("user", JSON.stringify(data.user));
                if (data.user.role === "admin") navigate("/admin/dashboard");
                else navigate("/shop");
            }
        } catch (err: any) {
            setError(err.message || "Authentication failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <LightRays
                raysOrigin="top-center"
                raysColor="#45f3ff"
                raysSpeed={1.5}
                lightSpread={0.8}
                rayLength={1.2}
                numRays={100}
                className="rays-bg"
            />

            <div className="form-container">
                <form className="form" onSubmit={handleSubmit}>
                    <h2>{isSignup ? "Create Account" : "Welcome Back"}</h2>

                    {error && <div className="auth-error">{error}</div>}

                    {isSignup && (
                        <div className="input">
                            <input
                                type="text"
                                name="name"
                                required
                                value={formData.name}
                                onChange={handleChange}
                            />
                            <label>Full Name</label>
                        </div>
                    )}

                    <div className="input">
                        <input
                            type="email"
                            name="email"
                            required
                            value={formData.email}
                            onChange={handleChange}
                        />
                        <label>Email</label>
                    </div>

                    <div className="input">
                        <input
                            type="password"
                            name="password"
                            required
                            value={formData.password}
                            onChange={handleChange}
                        />
                        <label>Password</label>
                    </div>

                    {isSignup && (
                        <>
                            <div className="input">
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    required
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                />
                                <label>Confirm Password</label>
                            </div>

                            <div className="input">
                                <select name="role" value={formData.role} onChange={handleChange}>
                                    <option value="customer">Customer</option>
                                    <option value="admin">Admin</option>
                                    <option value="supplier">Supplier</option>
                                    <option value="logistics">Logistics Partner</option>
                                </select>
                                <label>Role</label>
                            </div>

                            {formData.role !== "customer" && (
                                <div className="input">
                                    <input
                                        type="text"
                                        name="companyName"
                                        required
                                        value={formData.companyName}
                                        onChange={handleChange}
                                    />
                                    <label>Company Name</label>
                                </div>
                            )}
                        </>
                    )}

                    <button type="submit" disabled={loading}>
                        {loading ? "Processing..." : isSignup ? "Sign Up" : "Sign In"}
                    </button>

                    <p className="switch-text">
                        {isSignup ? "Already have an account? " : "Don't have an account? "}
                        <span onClick={() => setIsSignup(!isSignup)}>
                            {isSignup ? "Sign In" : "Sign Up"}
                        </span>
                    </p>

                    <div className="back-home" onClick={() => navigate("/")}>
                        &larr; Back to Home
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Signup;
