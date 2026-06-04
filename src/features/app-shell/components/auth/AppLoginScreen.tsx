import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Eye, EyeOff, Info, Lock, LogIn, RefreshCw, User } from 'lucide-react';
import type { FormEvent } from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type AppLoginScreenProps = {
  handleLogin: (event: FormEvent) => void;
  loginIdentifier: string;
  setLoginIdentifier: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  showPassword: boolean;
  setShowPassword: (value: boolean) => void;
  loginError: string;
  isLocked: boolean;
  lockoutSeconds: number;
  isLoading: boolean;
  showForgotMessage: boolean;
  pseudoFocused: boolean;
  setPseudoFocused: (value: boolean) => void;
  passwordFocused: boolean;
  setPasswordFocused: (value: boolean) => void;
};

export function AppLoginScreen({
  handleLogin,
  loginIdentifier,
  setLoginIdentifier,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  loginError,
  isLocked,
  lockoutSeconds,
  isLoading,
  showForgotMessage,
  pseudoFocused,
  setPseudoFocused,
  passwordFocused,
  setPasswordFocused,
}: AppLoginScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-20 -right-20 w-72 h-72 bg-blue-200/30 dark:bg-blue-500/5 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute -bottom-20 -left-20 w-80 h-80 bg-cyan-200/30 dark:bg-cyan-500/5 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.15, 0.25, 0.15],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-125 h-125 bg-slate-300/20 dark:bg-slate-600/5 rounded-full blur-3xl"
        />
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02]"
          style={{
            backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md mx-4 relative z-10"
      >
        <Card className="border border-slate-200/80 dark:border-slate-700/50 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl overflow-hidden">
          <div className="relative pt-10 pb-6 text-center bg-linear-to-b from-slate-50/50 to-transparent dark:from-slate-800/30 dark:to-transparent">
            <motion.div
              animate={{
                opacity: [0.3, 0.5, 0.3],
                scale: [1, 1.05, 1],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute inset-x-0 top-8 h-20 bg-blue-400/10 dark:bg-blue-500/5 blur-2xl"
            />

            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="relative flex items-center justify-center px-8"
            >
              <motion.img
                src="/logo_noc_activities_sans_fond.png"
                alt="NOC ACTIVITIES"
                className="w-[90%] max-w-[320px] h-auto relative z-10"
                style={{ aspectRatio: '464/165' }}
                animate={{
                  y: [0, -3, 0],
                }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = '/logo_sc.png';
                }}
              />
            </motion.div>

            <motion.div
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="mt-6 mx-8 h-px bg-linear-to-r from-transparent via-slate-300 dark:via-slate-600 to-transparent"
            />
          </div>

          <CardContent className="pt-4 pb-8 px-8">
            <motion.form
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              onSubmit={handleLogin}
              className="space-y-5"
            >
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4, duration: 0.4 }}
                className="relative group"
              >
                <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 transition-all duration-300 group-focus-within:scale-110">
                  <motion.div
                    animate={pseudoFocused ? { scale: 1.1, rotate: [0, -5, 5, 0] } : { scale: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <User className={`h-5 w-5 transition-colors duration-300 ${pseudoFocused ? 'text-blue-600' : 'text-slate-400'}`} />
                  </motion.div>
                </div>
                <Input
                  id="username"
                  type="text"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  onFocus={() => setPseudoFocused(true)}
                  onBlur={() => setPseudoFocused(false)}
                  className="h-14 pt-5 pb-2 pl-12 pr-4 text-base transition-all duration-300 border-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl bg-slate-50/50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800"
                  required
                />
                <label
                  htmlFor="username"
                  className={`absolute left-12 transition-all duration-300 pointer-events-none ${
                    pseudoFocused || loginIdentifier
                      ? 'top-2.5 text-[11px] text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wide'
                      : 'top-1/2 -translate-y-1/2 text-base text-slate-400'
                  }`}
                >
                  Pseudo
                </label>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5, duration: 0.4 }}
                className="relative group"
              >
                <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 transition-all duration-300 group-focus-within:scale-110">
                  <motion.div
                    animate={passwordFocused ? { scale: 1.1, rotate: [0, -5, 5, 0] } : { scale: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Lock className={`h-5 w-5 transition-colors duration-300 ${passwordFocused ? 'text-blue-600' : 'text-slate-400'}`} />
                  </motion.div>
                </div>
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  className="h-14 pt-5 pb-2 pl-12 pr-12 text-base transition-all duration-300 border-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl bg-slate-50/50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800"
                  required
                />
                <label
                  htmlFor="password"
                  className={`absolute left-12 transition-all duration-300 pointer-events-none ${
                    passwordFocused || password
                      ? 'top-2.5 text-[11px] text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wide'
                      : 'top-1/2 -translate-y-1/2 text-base text-slate-400'
                  }`}
                >
                  Mot de passe
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200"
                >
                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-slate-400 hover:text-blue-600 transition-colors" />
                    ) : (
                      <Eye className="h-5 w-5 text-slate-400 hover:text-blue-600 transition-colors" />
                    )}
                  </motion.div>
                </button>
              </motion.div>

              <AnimatePresence>
                {loginError && (
                  <motion.p
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="text-sm text-red-500 flex items-center gap-2 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800/50"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{loginError}</span>
                  </motion.p>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {isLocked && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, height: 0 }}
                    animate={{ opacity: 1, scale: 1, height: 'auto' }}
                    exit={{ opacity: 0, scale: 0.95, height: 0 }}
                    className="bg-linear-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200 dark:border-red-800/50 rounded-xl p-4 text-center overflow-hidden"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
                        <RefreshCw className="w-5 h-5 text-red-500" />
                      </motion.div>
                      <p className="text-red-600 dark:text-red-400 font-medium">
                        Veuillez patienter <span className="text-xl font-bold">{lockoutSeconds}</span> secondes
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.4 }}
                className="pt-2"
              >
                <motion.button
                  type="submit"
                  disabled={isLoading || isLocked}
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full h-14 relative overflow-hidden bg-linear-to-r from-blue-600 via-blue-600 to-cyan-600 hover:from-blue-700 hover:via-blue-700 hover:to-cyan-700 text-white font-semibold text-base shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300 rounded-xl disabled:opacity-70 disabled:cursor-not-allowed group"
                >
                  <motion.div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />

                  <span className="relative flex items-center justify-center gap-2.5">
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>Connexion en cours...</span>
                      </>
                    ) : (
                      <>
                        <motion.span
                          initial={{ x: -5, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: 0.7, duration: 0.3 }}
                        >
                          <LogIn className="w-5 h-5" />
                        </motion.span>
                        <motion.span
                          initial={{ x: 5, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: 0.75, duration: 0.3 }}
                        >
                          Se connecter
                        </motion.span>
                      </>
                    )}
                  </span>
                </motion.button>
              </motion.div>
            </motion.form>

            <AnimatePresence>
              {showForgotMessage && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginTop: 24 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="pt-5 border-t border-slate-200 dark:border-slate-700">
                    <motion.div
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.1, duration: 0.3 }}
                      className="bg-linear-to-r from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 rounded-xl p-4 text-center border border-amber-200/50 dark:border-amber-800/30"
                    >
                      <Info className="w-5 h-5 text-amber-500 mx-auto mb-2" />
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        Si vous avez oublié votre mot de passe ou votre pseudo,
                        <br />
                        merci de vous rapprocher de la <span className="font-semibold text-blue-600 dark:text-blue-400">Direction</span> ou
                        contacter le <span className="font-semibold text-blue-600 dark:text-blue-400">Responsable Système</span>.
                      </p>
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="text-center text-slate-400 dark:text-slate-500 text-xs mt-6 flex items-center justify-center gap-2"
        >
          <span className="w-8 h-px bg-slate-300 dark:bg-slate-700" />
          <span>(c) {new Date().getFullYear()} Silicone Connect</span>
          <span className="w-8 h-px bg-slate-300 dark:bg-slate-700" />
        </motion.p>
      </motion.div>
    </div>
  );
}
