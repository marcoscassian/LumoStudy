"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, User } from "lucide-react";

export default function Header() {
  const router = useRouter();
  const [stats, setStats] = useState({ coins: 0, streak: 0, xp: 0 });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      return;
    }

    const fetchUserStats = async () => {
      try {
        const response = await fetch("http://127.0.0.1:8000/login/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        const nextStats = {
          coins: Number(data.coins ?? 0),
          streak: Number(data.streak ?? 0),
          xp: Number(data.xp ?? 0),
        };

        setStats(nextStats);
      } catch (error) {
        console.error("Erro ao buscar stats do usuário:", error);
      }
    };

    fetchUserStats();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOpenProfile = () => {
    setIsMenuOpen(false);
    router.push("/usuario");
  };

  const handleLogout = async () => {
    const token = localStorage.getItem("token");

    try {
      if (token) {
        await fetch("http://127.0.0.1:8000/login/logout", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error("Erro ao fazer logout no backend:", error);
    } finally {
      localStorage.removeItem("token");
      setIsMenuOpen(false);
      router.push("/login");
    }
  };

  const level = Math.max(1, Math.floor(stats.xp / 1000) + 1);
  const xpInsideLevel = stats.xp % 1000;
  const xpPercent = Math.min(100, Math.max(0, Math.round((xpInsideLevel / 1000) * 100)));

  return (
    <header className="header header--compact">

      <div className="header-left">
        <Link href="/trilha" className="logo-small" aria-label="Voltar para a trilha de estudos">
          <img src="/chapeu.png" alt="Logo" />
          <span>LumoStudy</span>
        </Link>
      </div>

      <div className="header-center">
      </div>

      <div className="header-right">

        <div className="header-stats">
          <div className="coins">
            <img
              src="/header/coin.png"
              alt="Moeda"
              width={35}
              height={35}
            />
            <span className="coins-value">{stats.coins.toLocaleString("pt-BR")}</span>
          </div>

          <div className="streak">
            <img
              src="/header/fire.png"
              alt="Streak"
              width={30}
              height={30}
            />
            <span className="streak-value">{stats.streak} Dias</span>
          </div>

          <div className="xp">
            <div className="xp-level">Nível {level}</div>
            <div className="xp-bar">
              <div className="xp-fill" style={{ width: `${xpPercent}%` }} />
            </div>
            <div className="xp-text">{stats.xp.toLocaleString("pt-BR")} XP</div>
          </div>

        </div>

        <div className="header-avatar-wrapper" ref={menuRef}>
          <button
            type="button"
            className="header-avatar-trigger"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            title="Abrir menu"
            aria-expanded={isMenuOpen}
            aria-haspopup="menu"
          >
            <img src="/avatar.png" className="avatar" alt="Perfil" />
            <ChevronDown className={`header-avatar-chevron ${isMenuOpen ? "open" : ""}`} size={18} />
          </button>

          <div className={`avatar-dropdown ${isMenuOpen ? "visible" : ""}`} role="menu">
            <button type="button" className="avatar-dropdown-item" onClick={handleOpenProfile} role="menuitem">
              <User size={16} />
              <span>Meu perfil</span>
            </button>
            <button type="button" className="avatar-dropdown-item avatar-dropdown-item--danger" onClick={handleLogout} role="menuitem">
              <LogOut size={16} />
              <span>Sair</span>
            </button>
          </div>
        </div>

      </div>

    </header>
  );
}