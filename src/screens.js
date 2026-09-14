import { Container, Graphics } from 'pixi.js';
import { THEME, scaleFor } from './theme.js';
import { txt, panel, shadowPanel, button, progress, badge, itemCard } from './components.js';
import { state } from './state.js';

export class Screens {
  constructor(app, data, itemFrame = null) {
    this.app = app;
    this.data = data || {};
    this.itemFrame = itemFrame;
    this.layer = new Container();
    this.overlay = new Container();
    this.root = new Container();
    this.root.addChild(this.layer, this.overlay);
    this.app.stage.addChild(this.root);

    this.dim = new Graphics();
    this.dim.eventMode = 'static';
    this.dim.visible = false;
    this.dim.on('pointertap', () => this.close());
    this.overlay.addChild(this.dim);

    this.window = new Container();
    this.window.visible = false;
    this.overlay.addChild(this.window);
  }

  clear() {
    this.layer.removeChildren();
  }

  show(name) {
    state.screen = name;
    this.close();
    this.clear();

    switch (name) {
      case 'home': this.home(); break;
      case 'battle': this.battle(); break;
      case 'inventory': this.inventory(); break;
      case 'shop': this.shop(); break;
      case 'rank': this.rank(); break;
      case 'chat': this.chat(); break;
      case 'profile': this.profile(); break;
      case 'settings': this.settings(); break;
      case 'tasks': this.tasks(); break;
      case 'gifts': this.gifts(); break;
      case 'pass': this.pass(); break;
      case 'mail': this.mail(); break;
      default: this.home(); break;
    }

    this.layout();
  }

  header(title, sub = '') {
    const c = new Container();
    const h = txt(title, 20, THEME.ink, '900');
    h.anchor.set(0.5, 0);
    c.addChild(h);
    if (sub) {
      const s = txt(sub, 10, THEME.muted, '700');
      s.anchor.set(0.5, 0);
      s.position.set(0, 31);
      c.addChild(s);
    }
    return c;
  }

  home() {
    const c = new Container();
    this.layer.addChild(c);

    const card = shadowPanel(390, 320, THEME.cream, 30);
    card.position.set(0, 18);
    c.addChild(card);

    const ant = panel(104, 104, THEME.orange, 32, THEME.orangeLight);
    ant.position.set(0, -88);
    c.addChild(ant);

    const antText = txt('🐜', 52, THEME.cream, '900');
    antText.anchor.set(0.5);
    ant.addChild(antText);

    const brand = txt('ANTWAR', 30, THEME.orangeDeep, '900');
    brand.anchor.set(0.5);
    brand.position.set(0, -17);
    c.addChild(brand);

    const sub = txt('BATTLE COLONY', 10, THEME.muted, '900');
    sub.anchor.set(0.5);
    sub.position.set(0, 12);
    c.addChild(sub);

    const play = button('▶  PLAY', 248, 60, () => this.show('battle'), {
      fill: THEME.orange,
      text: THEME.cream,
      stroke: THEME.orangeDeep,
      radius: 18,
      size: 23
    });
    play.position.set(0, 72);
    c.addChild(play);

    const server = button(`●  ${state.server}   18ms`, 210, 42, () => this.serverMenu(), {
      fill: THEME.paper,
      text: THEME.ink,
      size: 11,
      radius: 13
    });
    server.position.set(0, 128);
    c.addChild(server);

    const stats = new Container();
    stats.position.set(0, 176);
    const statLabels = ['4,820 ONLINE', '342 ROOMS'];
    statLabels.forEach((label, i) => {
      const b = badge(label, i === 0 ? THEME.green : THEME.paper2, i === 0 ? THEME.cream : THEME.ink);
      b.position.set((i - 0.5) * 105, 0);
      stats.addChild(b);
    });
    c.addChild(stats);

    const create = button('＋ CREATE ROOM', 190, 44, () => this.show('battle'), {
      fill: THEME.paper,
      text: THEME.orangeDeep,
      stroke: THEME.orange,
      radius: 14,
      size: 12
    });
    create.position.set(0, 238);
    c.addChild(create);
  }

  battle() {
    const c = new Container();
    this.layer.addChild(c);
    const arena = shadowPanel(760, 470, THEME.paper, 30);
    c.addChild(arena);

    const title = txt('BATTLE ARENA', 28, THEME.orangeDeep, '900');
    title.anchor.set(0.5);
    title.position.set(0, -185);
    c.addChild(title);

    const subtitle = txt('Choose a room and enter the colony battle.', 12, THEME.muted, '700');
    subtitle.anchor.set(0.5);
    subtitle.position.set(0, -148);
    c.addChild(subtitle);

    const rooms = ['ORANGE NEST', 'DESERT RAID', 'COLONY WAR', 'NIGHT HUNT'];
    rooms.forEach((room, i) => {
      const b = button(`${room}\n${12 + i * 7}/20 PLAYERS`, 280, 68, () => {
        state.server = state.server || 'Middle East';
        this.toast(`${room} joined`);
      }, {
        fill: i === 0 ? THEME.orange : THEME.paper,
        text: i === 0 ? THEME.cream : THEME.ink,
        stroke: i === 0 ? THEME.orangeDeep : THEME.paper2,
        radius: 16,
        size: 12
      });
      b.position.set((i % 2 === 0 ? -145 : 145), -55 + Math.floor(i / 2) * 88);
      c.addChild(b);
    });

    const back = button('← BACK', 130, 42, () => this.show('home'), {
      fill: THEME.paper2,
      text: THEME.ink,
      radius: 13,
      size: 11
    });
    back.position.set(0, 175);
    c.addChild(back);
  }

  serverMenu() {
    const opts = this.data.servers?.servers || [];
    this.openWindow('SERVER REGION', 520, 380, (win) => {
      if (!opts.length) {
        const empty = txt('No regions available', 14, THEME.muted, '800');
        empty.anchor.set(0.5);
        empty.position.set(0, 0);
        win.addChild(empty);
        return;
      }
      opts.forEach((server, i) => {
        const b = button(`${server.flag || '•'}  ${(server.id || 'region').toUpperCase()}     ${server.ping || '--'}`, 360, 48, () => {
          state.server = server.id === 'me' ? 'Middle East' : String(server.id || 'REGION').toUpperCase();
          this.close();
          this.show('home');
        }, { fill: THEME.paper, text: THEME.ink, size: 12 });
        b.position.set(0, -110 + i * 58);
        win.addChild(b);
      });
    });
  }

  inventory() {
    this.openWindow('INVENTORY', 800, 570, (win) => {
      const title = this.header('INVENTORY', 'Your colony gear and resources');
      title.position.set(0, -235);
      win.addChild(title);

      const items = this.data.inv?.bag || [];
      items.slice(0, 12).forEach((item, i) => {
        const card = itemCard({
          title: `ITEM ${item.id || i + 1}`,
          rarity: item.rarity,
          quantity: item.quantity,
          texture: this.itemFrame,
          onClick: () => this.toast(`Selected item ${item.id || i + 1}`)
        });
        card.position.set(-255 + (i % 4) * 170, -55 + Math.floor(i / 4) * 170);
        win.addChild(card);
      });

      const equip = button('WARDROBE', 180, 46, () => this.toast('Wardrobe ready'), {
        fill: THEME.orange, text: THEME.cream, radius: 14, size: 12
      });
      equip.position.set(-100, 205);
      win.addChild(equip);

      const bag = button('BAG', 140, 46, () => this.toast('Bag active'), {
        fill: THEME.paper, text: THEME.orangeDeep, radius: 14, size: 12
      });
      bag.position.set(100, 205);
      win.addChild(bag);
    });
  }

  shop() {
    this.openWindow('SHOP', 850, 590, (win) => {
      const items = this.data.shop?.items || [];
      items.slice(0, 8).forEach((item, i) => {
        const b = button(`${item.amount || 'ITEM'}\n${item.price || ''}`, 170, 92, () => this.toast(`Purchased ${item.id || 'item'}`), {
          fill: i === 1 ? THEME.orange : THEME.paper,
          text: i === 1 ? THEME.cream : THEME.ink,
          radius: 18,
          size: 12
        });
        b.position.set(-280 + (i % 4) * 187, -100 + Math.floor(i / 4) * 128);
        win.addChild(b);
      });
      const note = txt('Featured offers • Orange is the primary action', 12, THEME.muted, '800');
      note.anchor.set(0.5);
      note.position.set(0, 190);
      win.addChild(note);
    });
  }

  rank() {
    this.openWindow('LEADERBOARD', 760, 540, (win) => {
      const names = ['Queen Guard', 'Thunder Scout', 'Sand Raider', 'Kite Shield', 'You'];
      names.forEach((name, i) => {
        const row = shadowPanel(620, 54, i === 0 ? THEME.cream : THEME.paper, 13);
        row.position.set(0, -150 + i * 64);
        const label = txt(`#${i + 1}   ${name}`, 14, THEME.ink, '900');
        label.anchor.set(0.5);
        row.addChild(label);
        win.addChild(row);
      });
    });
  }

  profile() {
    this.openWindow('PLAYER PROFILE', 720, 520, (win) => {
      const hero = shadowPanel(640, 120, THEME.cream, 24);
      hero.position.set(0, -145);
      win.addChild(hero);

      const avatar = panel(82, 82, THEME.orange, 26, THEME.orangeDeep);
      avatar.position.set(-250, -145);
      win.addChild(avatar);
      const icon = txt('⚔', 36, THEME.cream, '900');
      icon.anchor.set(0.5);
      avatar.addChild(icon);

      const name = txt('Ant Commander', 21, THEME.ink, '900');
      name.anchor.set(0, 0.5);
      name.position.set(-190, -160);
      win.addChild(name);

      const level = txt('LEVEL 18', 11, THEME.orangeDeep, '900');
      level.anchor.set(0, 0.5);
      level.position.set(-190, -130);
      win.addChild(level);

      const xp = progress(430, 12, 0.62, THEME.orange);
      xp.position.set(0, -76);
      win.addChild(xp);

      [['POWER', '14,850'], ['WINS', '428'], ['RANK', '#42']].forEach((entry, i) => {
        const stat = shadowPanel(180, 80, THEME.paper, 16);
        stat.position.set(-200 + i * 200, 60);
        const statName = txt(entry[0], 10, THEME.muted, '800');
        statName.anchor.set(0.5);
        statName.position.set(0, -10);
        stat.addChild(statName);
        const value = txt(entry[1], 19, THEME.orangeDeep, '900');
        value.anchor.set(0.5);
        value.position.set(0, 14);
        stat.addChild(value);
        win.addChild(stat);
      });
    });
  }

  settings() {
    this.openWindow('SETTINGS & CONTROLS', 760, 560, (win) => {
      ['GAMEPLAY', 'GRAPHICS', 'AUDIO', 'LANGUAGE'].forEach((label, i) => {
        const b = button(label, 250, 48, () => this.toast(`${label} selected`), {
          fill: i === 0 ? THEME.orange : THEME.paper,
          text: i === 0 ? THEME.cream : THEME.ink,
          radius: 14,
          size: 12
        });
        b.position.set(-180 + (i % 2) * 360, -170 + Math.floor(i / 2) * 66);
        win.addChild(b);
      });

      const settings = [
        ['AUTO-SAVE', 'autoSave'],
        ['SHOW PING', 'showPing'],
        ['SCREEN FX', 'screenFx'],
        ['MUSIC', 'music'],
        ['SFX', 'sfx']
      ];
      settings.forEach((entry, i) => {
        const enabled = Boolean(state.settings?.[entry[1]]);
        const b = button(`${entry[0]}   ${enabled ? 'ON' : 'OFF'}`, 260, 44, () => {
          state.settings[entry[1]] = !enabled;
          this.settings();
        }, {
          fill: enabled ? THEME.orange : THEME.paper,
          text: enabled ? THEME.cream : THEME.ink,
          radius: 13,
          size: 11
        });
        b.position.set(0, -20 + i * 55);
        win.addChild(b);
      });
    });
  }

  chat() {
    this.openWindow('COLONY CHAT', 780, 550, (win) => {
      const messages = state.chat || [];
      messages.slice(-6).forEach((message, i) => {
        const row = shadowPanel(630, 64, i % 2 ? THEME.paper : THEME.cream, 14);
        row.position.set(0, -160 + i * 75);
        const user = txt(message.user || 'Player', 11, THEME.orangeDeep, '900');
        user.anchor.set(0, 0.5);
        user.position.set(-285, -12);
        row.addChild(user);
        const text = txt(message.text || '', 12, THEME.ink, '700');
        text.anchor.set(0, 0.5);
        text.position.set(-285, 15);
        row.addChild(text);
        win.addChild(row);
      });

      const send = button('SEND', 120, 42, () => {
        state.chat = state.chat || [];
        state.chat.push({ user: 'You', text: 'Ready!', time: 'now' });
        this.chat();
      }, { fill: THEME.orange, text: THEME.cream, radius: 13, size: 12 });
      send.position.set(260, 195);
      win.addChild(send);
    });
  }

  tasks() {
    this.openWindow('DAILY TASKS', 760, 560, (win) => {
      const tasks = this.data.nav?.dailyQuests?.daily || [];
      tasks.slice(0, 5).forEach((task, i) => {
        const row = shadowPanel(620, 72, THEME.paper, 14);
        row.position.set(0, -165 + i * 82);
        const label = txt(`TASK ${i + 1}    ${task.progress || 0}/${task.max || 0}`, 13, THEME.ink, '900');
        label.anchor.set(0.5);
        row.addChild(label);
        win.addChild(row);
      });
    });
  }

  gifts() {
    this.openWindow('DAILY GIFTS', 760, 520, (win) => {
      const rewards = this.data.nav?.dailyRewards || [];
      rewards.slice(0, 8).forEach((reward, i) => {
        const isReady = i === 0;
        const b = button(`DAY ${reward.day || i + 1}\n+${reward.amount || 0}`, 150, 96, () => {
          this.toast(isReady ? 'Reward claimed!' : 'Locked');
        }, {
          fill: isReady ? THEME.orange : THEME.paper,
          text: isReady ? THEME.cream : THEME.ink,
          radius: 17,
          size: 12
        });
        b.position.set(-270 + (i % 4) * 180, -90 + Math.floor(i / 4) * 125);
        win.addChild(b);
      });
    });
  }

  pass() {
    this.openWindow('ROYAL PASS', 780, 560, (win) => {
      const passProgress = progress(560, 18, 0.7, THEME.orange);
      passProgress.position.set(0, -180);
      win.addChild(passProgress);

      for (let i = 0; i < 6; i += 1) {
        const reward = button(`T-${i + 1}\nREWARD`, 150, 92, () => this.toast(`Tier ${i + 1}`), {
          fill: i === 2 ? THEME.orange : THEME.paper,
          text: i === 2 ? THEME.cream : THEME.ink,
          radius: 16,
          size: 12
        });
        reward.position.set(-280 + (i % 3) * 280, -70 + Math.floor(i / 3) * 125);
        win.addChild(reward);
      }
    });
  }

  mail() {
    this.openWindow('MAILBOX', 720, 520, (win) => {
      ['Battle reward', 'Welcome pack', 'System message'].forEach((message, i) => {
        const row = shadowPanel(590, 60, THEME.paper, 14);
        row.position.set(0, -130 + i * 78);
        const label = txt(message, 13, THEME.ink, '900');
        label.anchor.set(0, 0.5);
        label.position.set(-270, 0);
        row.addChild(label);
        win.addChild(row);
      });
    });
  }

  openWindow(title, width, height, render) {
    this.window.removeChildren();
    this.dim.visible = true;
    this.window.visible = true;

    const shell = shadowPanel(width, height, THEME.paper, 28);
    shell.position.set(this.app.screen.width / 2, this.app.screen.height / 2);
    this.window.addChild(shell);

    const heading = txt(title, 22, THEME.orangeDeep, '900');
    heading.anchor.set(0.5);
    heading.position.set(this.app.screen.width / 2, this.app.screen.height / 2 - height / 2 + 34);
    this.window.addChild(heading);

    const close = button('×', 44, 44, () => this.close(), {
      fill: THEME.orange,
      text: THEME.cream,
      radius: 14,
      size: 25
    });
    close.position.set(this.app.screen.width / 2 + width / 2 - 38, this.app.screen.height / 2 - height / 2 + 36);
    this.window.addChild(close);

    render(this.window);
  }

  close() {
    this.dim.visible = false;
    this.window.visible = false;
    this.window.removeChildren();
  }

  toast(message) {
    const toast = new Container();
    const width = Math.min(420, Math.max(240, String(message).length * 8 + 36));
    const background = panel(width, 48, THEME.orange, 15, THEME.orangeDeep);
    toast.addChild(background);
    const label = txt(message, 11, THEME.cream, '900');
    label.anchor.set(0.5);
    toast.addChild(label);
    toast.position.set(this.app.screen.width / 2, this.app.screen.height - 70);
    this.overlay.addChild(toast);
    window.setTimeout(() => toast.destroy(), 1500);
  }

  layout() {
    const scale = scaleFor(this.app.screen.width, this.app.screen.height);
    this.layer.scale.set(scale);
    this.layer.position.set(this.app.screen.width / 2, this.app.screen.height / 2 + 18);
    this.overlay.scale.set(1);
    this.dim.clear();
    this.dim.rect(0, 0, this.app.screen.width, this.app.screen.height);
    this.dim.fill({ color: THEME.night, alpha: 0.52 });
  }
}
