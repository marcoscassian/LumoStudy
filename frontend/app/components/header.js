"use client";

import Link from "next/link";
import { Flame } from "lucide-react";
 
export default function Header() {
  return (
    <header className="header header--compact">

      <div className="header-left">
        <div className="logo-small">
          <img src="/chapeu.png" alt="Logo" />
          <span>LumoStudy</span>
        </div>
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
            <span className="coins-value">1.250</span>
          </div>

          <div className="streak">
            <Flame size={16} />
            <span className="streak-value">16 Dias</span>
          </div>

          <div className="xp">
            <div className="xp-level">Nível 12</div>
            <div className="xp-bar">
              <div className="xp-fill" style={{ width: '70%' }} />
            </div>
            <div className="xp-text">2.450 / 3.500 XP</div>
          </div>

        </div>

        <Link href="/usuario" className="header-avatar" title="Ver perfil">
          <img src="/avatar.png" className="avatar" alt="Perfil" />
        </Link>

      </div>

    </header>
  );
}