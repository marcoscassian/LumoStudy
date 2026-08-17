"use client";

import { Star, Flame, Pencil, Feather } from "lucide-react";

export default function ProfileHero({ user }) {
  const xpPercent = Math.min(
    100,
    Math.round((user.currentXp / user.nextLevelXp) * 100)
  );

  return (
    <section className="profile-hero">
      <div className="profile-hero-stars" />
      <img src="/castelo.png" alt="" className="profile-hero-castle" />

      <div className="profile-hero-content">
        <div className="profile-hero-top">
          <div className="profile-hero-user">
            <div className="profile-hero-avatar">
              <img src={user.avatar} alt={user.name} />
            </div>

            <div className="profile-hero-info">
              <span className="profile-hero-greeting">Olá, Bruxo!</span>
              <h1>{user.name}</h1>

              <div className="profile-hero-level">
                <span className="level-tag">Nível {user.level}</span>
                <div className="level-bar">
                  <div
                    className="level-fill"
                    style={{ width: `${xpPercent}%` }}
                  />
                </div>
                <span className="level-xp">
                  {user.currentXp.toLocaleString("pt-BR")} /{" "}
                  {user.nextLevelXp.toLocaleString("pt-BR")} XP
                </span>
              </div>
            </div>
          </div>

          <div className={`profile-hero-house house-${user.houseSlug}`}>
            <div className="house-crest">
              <Feather size={26} />
            </div>
            <div>
              <span>Casa</span>
              <h2>{user.house}</h2>
            </div>
          </div>
        </div>

        <div className="profile-hero-bottom">
          <div className="profile-hero-stats">
            <div className="hero-stat coins">
              <Star size={16} />
              <span>{user.coins.toLocaleString("pt-BR")}</span>
            </div>
            <div className="hero-stat streak">
              <Flame size={16} />
              <span>{user.streak} Dias</span>
            </div>
          </div>

          <button className="btn-edit-profile" type="button">
            Editar perfil <Pencil size={15} />
          </button>
        </div>
      </div>
    </section>
  );
}