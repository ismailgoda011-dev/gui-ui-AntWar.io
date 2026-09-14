# GUI image assets

All GUI image references now resolve under `img/`.

The supplied `gui.zip` did not contain the referenced PNG/GIF artwork files; it contained only their references in HTML/JS/JSON. Therefore this update creates the canonical asset directory and changes all runtime paths to `img/<asset>` without inventing or replacing the original artwork.

Required assets referenced by the GUI include:
- bg0.png, bg5.png
- box.png, box-big.png, box-big-Brother.png, box-white.png, box-white-brother.png
- frame.png, frame-item.png
- ant1.png, ant2.png, beetle.png
- Play.png, Create Room.png, Empty-button.png, X.png
- Coin.png, Diamond.png, bag.png
- shop.png, mail.png, Rank.png, Wardrobe.png, friend.png, Settings.png, Chat.png
- Daily-Gifts.png, Task.png, RoyalPass.png
- enable.png, disabled.png, arrow-Menu.png, option-Menu.png
- Text BackgroundBox.png, namePalyer.png, topbar-box.png, Save.png, Exit.png
