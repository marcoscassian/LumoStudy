"use client";

import Link from "next/link";
import { Star, Flame, Settings, Feather } from "lucide-react";
import AvatarImage from "../../components/avatar-image";

export default function ProfileHero({ user }) {
  return (
    <section className="profile-hero">
      <div className="profile-hero-stars" />
      <img src="/castelo.png" alt="" className="profile-hero-castle" />
      <div className="profile-hero-content">
        <div className="profile-hero-top">
          <div className="profile-hero-user">
            <div className="profile-hero-avatar"><AvatarImage onError={(e) => { e.currentTarget.src = "/avatar.png"; }} src={user.avatar} alt={user.name} /></div>
            <div className="profile-hero-info">
              <span className="profile-hero-greeting">Olá, Bruxo!</span>
              <h1>{user.name}</h1>
              <p className="profile-hero-intro">Seu painel de estudos e conquistas no mundo bruxo.</p>
            </div>
          </div>
          <div className={`profile-hero-house house-${user.houseSlug}`}>
            <div className="house-crest"><Feather size={26} /></div>
            <div><span>Casa</span><h2>{user.house}</h2></div>
          </div>
        </div>
        <div className="profile-hero-bottom">
          <div className="profile-hero-stats">
            <div className="hero-stat coins"><Star size={16} /><span>{user.coins.toLocaleString("pt-BR")}</span></div>
            <div className="hero-stat streak"><Flame size={16} /><span>{user.streak} Dias</span></div>
          </div>
          <div className="profile-hero-actions">
            <Link className="btn-edit-profile" href="/configuracoes">
              Editar perfil <Settings size={15} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
