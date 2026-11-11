// HADES Store native catalog viewer for PS4 (OpenOrbis + SDL2).
#include <SDL2/SDL.h>
#include <orbis/Sysmodule.h>
#include <algorithm>
#include <cmath>
#include <cctype>
#include <cstdio>
#include <cstring>
#include <string>
#include <vector>
#include "generated_catalog.h"

extern "C" int sceSystemServiceLaunchWebBrowser(const char* uri, void* reserved);

static const int SW = 1920, SH = 1080, ITEMS_PER_PAGE = 10;
static const char* FILTERS[] = {"TODOS", "JOGOS", "APLICATIVOS", "EMULADORES"};
static const int FILTER_COUNT = 4;
static SDL_Window* windowHandle = nullptr;
static SDL_Renderer* renderer = nullptr;
static SDL_GameController* gameController = nullptr;
static SDL_Texture* fontTexture = nullptr;
static std::vector<SDL_Texture*> coverTextures;
static SDL_Texture* hadesTexture = nullptr;
static SDL_Texture* avatarTexture = nullptr;
static SDL_Texture* bannerTexture = nullptr;
static SDL_Texture* sigilTexture = nullptr;
static std::vector<int> visible;
static std::vector<unsigned char> favoriteItems;
static bool favoritesOnly = false;
static bool searchActive = false;
static std::string searchQuery;
static int keyboardIndex = 0;
static const char* VIRTUAL_KEYS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -_";
static bool favoritesPersistenceAvailable = false;
static const char* FAVORITES_FILE = "/data/hades-store-favorites.dat";
static int selected = 0, filterIndex = 0;
static int homeAction = 0;
static bool homeScreen = false, showDetails = false, running = true;
static bool frameDirty = true;

struct Glyph { char key; unsigned char rows[7]; };
static const Glyph FONT[] = {
 {'A',{14,17,17,31,17,17,17}},{'B',{30,17,17,30,17,17,30}},{'C',{14,17,16,16,16,17,14}},
 {'D',{30,17,17,17,17,17,30}},{'E',{31,16,16,30,16,16,31}},{'F',{31,16,16,30,16,16,16}},
 {'G',{14,17,16,23,17,17,15}},{'H',{17,17,17,31,17,17,17}},{'I',{14,4,4,4,4,4,14}},
 {'J',{7,2,2,2,18,18,12}},{'K',{17,18,20,24,20,18,17}},{'L',{16,16,16,16,16,16,31}},
 {'M',{17,27,21,21,17,17,17}},{'N',{17,25,21,19,17,17,17}},{'O',{14,17,17,17,17,17,14}},
 {'P',{30,17,17,30,16,16,16}},{'Q',{14,17,17,17,21,18,13}},{'R',{30,17,17,30,20,18,17}},
 {'S',{15,16,16,14,1,1,30}},{'T',{31,4,4,4,4,4,4}},{'U',{17,17,17,17,17,17,14}},
 {'V',{17,17,17,17,17,10,4}},{'W',{17,17,17,21,21,21,10}},{'X',{17,17,10,4,10,17,17}},
 {'Y',{17,17,10,4,4,4,4}},{'Z',{31,1,2,4,8,16,31}},
 {'0',{14,17,19,21,25,17,14}},{'1',{4,12,4,4,4,4,14}},{'2',{14,17,1,2,4,8,31}},
 {'3',{30,1,1,14,1,1,30}},{'4',{2,6,10,18,31,2,2}},{'5',{31,16,16,30,1,1,30}},
 {'6',{14,16,16,30,17,17,14}},{'7',{31,1,2,4,8,8,8}},{'8',{14,17,17,14,17,17,14}},
 {'9',{14,17,17,15,1,1,14}},{'-',{0,0,0,31,0,0,0}},{'.',{0,0,0,0,0,12,12}},
 {':',{0,12,12,0,12,12,0}},{'/',{1,2,2,4,8,8,16}},{'?',{14,17,1,2,4,0,4}},
 {'!',{4,4,4,4,4,0,4}},{'(' ,{2,4,8,8,8,4,2}},{')',{8,4,2,2,2,4,8}},
 {'+', {0,4,4,31,4,4,0}},{'\'',{4,4,2,0,0,0,0}},{',',{0,0,0,0,0,4,8}},
 {'_',{0,0,0,0,0,0,31}},{'&',{12,18,20,8,21,18,13}},{'=',{0,31,0,31,0,0,0}}
};

static void color(Uint8 r, Uint8 g, Uint8 b, Uint8 a=255) { SDL_SetRenderDrawColor(renderer,r,g,b,a); }
static void fill(int x,int y,int w,int h,Uint8 r,Uint8 g,Uint8 b,Uint8 a=255) { color(r,g,b,a); SDL_Rect q{x,y,w,h}; SDL_RenderFillRect(renderer,&q); }
static void outline(int x,int y,int w,int h,Uint8 r,Uint8 g,Uint8 b,int thickness=2) {
    color(r,g,b); SDL_Rect q{x,y,w,h};
    for(int i=0;i<thickness;i++){ SDL_RenderDrawRect(renderer,&q); q.x++; q.y++; q.w-=2; q.h-=2; }
}
static const Glyph* glyph(char c) {
    if(c>='a'&&c<='z') c=(char)(c-'a'+'A');
    for(const Glyph& g:FONT) if(g.key==c) return &g;
    return nullptr;
}
static int textWidth(const std::string& s,int scale){ return (int)s.size()*6*scale; }
static void text(int x,int y,const std::string& s,Uint8 r,Uint8 g,Uint8 b,int scale=3,int maxWidth=0) {
    if(fontTexture){
        SDL_SetTextureColorMod(fontTexture,r,g,b);
        int pen=x,cellW=6*scale,cellH=8*scale;
        for(unsigned char c:s){
            if(maxWidth>0&&pen+cellW>maxWidth)break;
            if(c>=32&&c<=126){int index=(int)c-32;SDL_Rect src{(index%16)*64,(index/16)*80,64,80};SDL_Rect dst{pen,y,cellW,cellH};SDL_RenderCopy(renderer,fontTexture,&src,&dst);}
            pen+=cellW;
        }
        return;
    }
    color(r,g,b);
    for(char c:s){
        if(maxWidth>0 && x+5*scale>maxWidth) break;
        const Glyph* gptr=glyph(c);
        if(gptr) for(int row=0;row<7;row++) for(int col=0;col<5;col++) if(gptr->rows[row]&(1<<(4-col))){ SDL_Rect p{x+col*scale,y+row*scale,scale,scale}; SDL_RenderFillRect(renderer,&p); }
        x+=6*scale;
    }
}
static std::string trim(const char* s,int max){ std::string v=s?s:""; if((int)v.size()>max){v=v.substr(0,max-3)+"...";} return v; }
static bool matches(const char* category, int itemIndex){
    if(searchActive && !searchQuery.empty()){
        std::string hay=STORE_ITEMS[itemIndex].name; hay+=' '; hay+=STORE_ITEMS[itemIndex].description;
        std::string needle=searchQuery;
        std::transform(hay.begin(),hay.end(),hay.begin(),[](unsigned char c){return (char)std::tolower(c);});
        std::transform(needle.begin(),needle.end(),needle.begin(),[](unsigned char c){return (char)std::tolower(c);});
        if(hay.find(needle)==std::string::npos)return false;
    }
    if(favoritesOnly && (itemIndex<0 || itemIndex>=(int)favoriteItems.size() || !favoriteItems[itemIndex])) return false;
    if(filterIndex==0) return true;
    if(filterIndex==1) return !std::strcmp(category,"Jogos");
    if(filterIndex==2) return !std::strcmp(category,"Aplicativos");
    return !std::strcmp(category,"Emuladores");
}
static void refresh(){
    visible.clear();
    for(int i=0;i<STORE_ITEM_COUNT;i++) if(matches(STORE_ITEMS[i].category,i)) visible.push_back(i);
    if(visible.empty()) selected=0; else selected=std::min(selected,(int)visible.size()-1);
}
static void circle(int cx,int cy,int radius,Uint8 r,Uint8 g,Uint8 b){
    color(r,g,b); for(int y=-radius;y<=radius;y++){int xx=(int)(radius*radius-y*y);int x=0;while((x+1)*(x+1)<=xx)x++;SDL_RenderDrawLine(renderer,cx-x,cy+y,cx+x,cy+y);}
}
static SDL_Texture* loadTexture(const char* path, bool alphaMask=false){
    if(!path||!path[0])return nullptr;
    SDL_Surface* source=SDL_LoadBMP(path);
    if(!source)return nullptr;
    SDL_Surface* prepared=source;
    if(alphaMask){
        prepared=SDL_CreateRGBSurfaceWithFormat(0,source->w,source->h,32,SDL_PIXELFORMAT_RGBA32);
        if(!prepared){SDL_FreeSurface(source);return nullptr;}
        if(SDL_MUSTLOCK(source))SDL_LockSurface(source);
        if(SDL_MUSTLOCK(prepared))SDL_LockSurface(prepared);
        for(int y=0;y<source->h;y++)for(int x=0;x<source->w;x++){
            Uint32 pixel;std::memcpy(&pixel,(Uint8*)source->pixels+y*source->pitch+x*source->format->BytesPerPixel,source->format->BytesPerPixel);
            Uint8 r,g,b;SDL_GetRGB(pixel,source->format,&r,&g,&b);
            Uint8 a=(Uint8)(((int)r+(int)g+(int)b)/3);
            Uint32 out=SDL_MapRGBA(prepared->format,255,255,255,a);
            std::memcpy((Uint8*)prepared->pixels+y*prepared->pitch+x*prepared->format->BytesPerPixel,&out,prepared->format->BytesPerPixel);
        }
        if(SDL_MUSTLOCK(prepared))SDL_UnlockSurface(prepared);
        if(SDL_MUSTLOCK(source))SDL_UnlockSurface(source);
    }
    SDL_Texture* texture=SDL_CreateTextureFromSurface(renderer,prepared);
    if(alphaMask)SDL_FreeSurface(prepared);
    SDL_FreeSurface(source);
    if(texture)SDL_SetTextureBlendMode(texture,SDL_BLENDMODE_BLEND);
    return texture;
}
static SDL_Texture* coverTexture(int itemIndex){
    if(itemIndex<0||itemIndex>=STORE_ITEM_COUNT)return nullptr;
    if(coverTextures[itemIndex])return coverTextures[itemIndex];
    coverTextures[itemIndex]=loadTexture(STORE_ITEMS[itemIndex].imagePath);
    return coverTextures[itemIndex];
}
static void drawCover(int itemIndex,int x,int y,int w,int h){
    fill(x,y,w,h,18,21,32);
    SDL_Texture* texture=coverTexture(itemIndex);
    if(texture){SDL_Rect dst{x,y,w,h};SDL_RenderCopy(renderer,texture,nullptr,&dst);}
    else {
        outline(x+2,y+2,w-4,h-4,89,83,102,2);
        text(x+12,y+h/2-10,trim(STORE_ITEMS[itemIndex].name,16),238,230,218,2,x+w-5);
    }
}
static void drawCard(int slot,int itemIndex,bool active){
    int col=slot%5,row=slot/5,x=300+col*318,y=344+row*300,w=296,h=282;
    fill(x,y,w,h,active?8:5,active?40:20,active?80:37);
    outline(x,y,w,h,active?112:31,active?216:105,active?255:170,active?4:2);
    const StoreItem& it=STORE_ITEMS[itemIndex];
    fill(x+10,y+8,w-20,24,7,94,180);
    const char* platform=(std::string(it.category)=="Jogos"&&std::string(it.version)=="PS5")?"PS5":"PS4";
    text(x+19,y+12,platform,255,255,255,2);
    if(itemIndex<(int)favoriteItems.size()&&favoriteItems[itemIndex])text(x+w-112,y+12,"FAVORITO",255,224,120,2);
    const int coverW=178,coverH=205,coverX=x+(w-coverW)/2,coverY=y+38;
    drawCover(itemIndex,coverX,coverY,coverW,coverH);
    text(x+12,y+250,trim(it.name,30),244,248,255,2,x+w-12);
    text(x+14,y+272,trim(it.category,19),105,195,255,2);
    if(active)text(x+w-104,y+272,"X ABRIR",180,220,255,2);
}
static void wrapText(int x,int y,const char* raw,Uint8 r,Uint8 g,Uint8 b,int chars=70){
    std::string s=raw?raw:""; int line=0;
    while(!s.empty()&&line<5){size_t n=std::min((size_t)chars,s.size());if(n<s.size()){size_t k=s.rfind(' ',n);if(k!=std::string::npos&&k>0)n=k;}text(x,y+line*36,s.substr(0,n),r,g,b,3);s.erase(0,n);while(!s.empty()&&s[0]==' ')s.erase(0,1);line++;}
}
static void draw(){
    fill(0,0,SW,SH,2,8,22);
    if(hadesTexture){SDL_SetTextureAlphaMod(hadesTexture,20);SDL_Rect bg{0,0,SW,SH};SDL_RenderCopy(renderer,hadesTexture,nullptr,&bg);SDL_SetTextureAlphaMod(hadesTexture,255);}
    fill(0,0,SW,SH,2,9,23,195);
    if(bannerTexture){SDL_Rect banner{920,0,1000,220};SDL_RenderCopy(renderer,bannerTexture,nullptr,&banner);}
    fill(0,216,SW,3,24,139,235);
    if(sigilTexture){SDL_Rect mark{28,22,96,96};SDL_RenderCopy(renderer,sigilTexture,nullptr,&mark);}
    text(137,30,"HADES STORE",245,248,255,5);
    text(139,86,"JOGOS  /  APLICATIVOS  /  EMULADORES",176,211,247,2);

    int tabX=256;
    for(int i=0;i<FILTER_COUNT;i++){
        int width=340,x=tabX+i*350;
        bool active=i==filterIndex;
        fill(x,226,width,58,active?8:4,active?83:20,active?168:38);
        outline(x,226,width,58,active?91:28,active?208:80,active?255:125,active?3:1);
        text(x+24,246,FILTERS[i],active?255:205,active?255:220,active?255:239,3);
    }

    fill(0,292,280,704,2,10,25,235);fill(278,292,2,704,16,115,210);
    if(avatarTexture){SDL_Rect avatar{66,310,170,170};SDL_RenderCopy(renderer,avatarTexture,nullptr,&avatar);}
    else if(hadesTexture){SDL_Rect avatar{66,310,170,170};SDL_RenderCopy(renderer,hadesTexture,nullptr,&avatar);}
    outline(66,310,170,170,67,190,255,3);
    text(111,491,"HADES",245,248,255,2);
    text(91,518,"BEM-VINDO!",174,204,239,1);
    text(30,566,"CASA",228,239,255,2);
    text(30,616,"BUSCAR",228,239,255,2);
    text(300,330,searchActive?(std::string("BUSCA: ")+searchQuery+"  (ESC LIMPAR)"):"APERTE / PARA BUSCAR",150,210,255,2);
    text(30,666,"FAVORITOS",228,239,255,2);
    text(30,716,"DOWNLOADS",228,239,255,2);
    text(30,766,"CONFIGURACOES",228,239,255,2);
    text(30,816,"SAIR",228,239,255,2);
    text(280,307,favoritesOnly?"FAVORITOS":"CATALOGO",246,248,255,4);
    char page[48];std::snprintf(page,sizeof(page),"%d / %d",visible.empty()?0:selected+1,(int)visible.size());
    text(1695,312,page,194,221,249,2);
    if(visible.empty()){text(315,530,"NENHUM ITEM NESTA CATEGORIA",241,239,247,4);}
    else {
        int first=(selected/ITEMS_PER_PAGE)*ITEMS_PER_PAGE;
        for(int slot=0;slot<ITEMS_PER_PAGE&&first+slot<(int)visible.size();slot++)
            drawCard(slot,visible[first+slot],first+slot==selected);
    }
    drawVirtualKeyboard();
    fill(0,998,SW,3,33,139,227);
    fill(0,1001,SW,79,3,12,29,239);
    text(28,1025,"X SELECIONAR",79,208,255,2);
    text(270,1050,"L3 FAVORITAR   R3 FILTRAR FAVORITOS",130,190,235,2);
    text(1430,1050,favoritesPersistenceAvailable?"FAVORITOS SALVOS":"SALVAMENTO NAO CONFIRMADO",favoritesPersistenceAvailable?120:235,favoritesPersistenceAvailable?220:170,180,1);
    text(270,1025,"O VOLTAR",255,82,137,2);
    text(495,1025,"L1 / R1 CATEGORIAS",70,229,176,2);
    text(790,1025,"TRIANGULO INICIO   DIRECIONAL NAVEGAR",204,225,242,2);
    text(1510,1025,"SUA LOJA DE GAMES NO PS4",126,191,255,2);
    if(showDetails&&!visible.empty()){
        fill(0,0,SW,SH,0,0,0,210);fill(235,145,1450,790,12,24,47);outline(235,145,1450,790,76,190,255,3);
        const StoreItem& it=STORE_ITEMS[visible[selected]];
        drawCover(visible[selected],290,275,270,405);
        text(625,265,"DETALHES DO ITEM",105,211,255,3);text(625,325,trim(it.name,54),244,248,255,5);
        text(625,395,trim(it.category,30),169,214,255,3);wrapText(625,455,it.description,203,222,244,75);
        if(it.recommendedGames && it.recommendedGames[0]){text(625,650,"JOGOS RECOMENDADOS",105,195,255,2);wrapText(625,690,it.recommendedGames,210,225,245,92);}
        text(625,850,"X ABRIR LINK NO NAVEGADOR DO PS4",105,195,255,3);
        text(625,748,trim(it.url,100),170,198,224,2);
        text(625,930,"O VOLTAR AO CATALOGO",170,205,235,2);
    }
    SDL_UpdateWindowSurface(windowHandle);
}
static void openSelected(){if(visible.empty())return;const char* url=STORE_ITEMS[visible[selected]].url;if(url&&url[0])sceSystemServiceLaunchWebBrowser(url,nullptr);}
static void handleDirection(int dx,int dy){
    if(showDetails)return;
    if(visible.empty())return;
    int next=selected+dx+dy*5; if(next<0)next=0;if(next>=(int)visible.size())next=(int)visible.size()-1;selected=next;
}
static void changeFilter(int amount){filterIndex=(filterIndex+amount+FILTER_COUNT)%FILTER_COUNT;selected=0;favoritesOnly=false;refresh();}
static void loadFavorites(){
    FILE* file=std::fopen(FAVORITES_FILE,"rb");
    if(!file) return;
    char magic[4]={0,0,0,0};
    unsigned int count=0;
    bool valid=std::fread(magic,1,4,file)==4 && std::memcmp(magic,"HDSF",4)==0 &&
        std::fread(&count,sizeof(count),1,file)==1 && count==STORE_ITEM_COUNT &&
        std::fread(favoriteItems.data(),1,favoriteItems.size(),file)==favoriteItems.size();
    std::fclose(file);
    if(!valid){std::fill(favoriteItems.begin(),favoriteItems.end(),0);return;}
    favoritesPersistenceAvailable=true;
}
static void saveFavorites(){
    const char* temporary="/data/hades-store-favorites.tmp";
    FILE* file=std::fopen(temporary,"wb");
    if(!file){favoritesPersistenceAvailable=false;return;}
    const char magic[4]={'H','D','S','F'};
    unsigned int count=(unsigned int)favoriteItems.size();
    bool ok=std::fwrite(magic,1,4,file)==4 &&
        std::fwrite(&count,sizeof(count),1,file)==1 &&
        std::fwrite(favoriteItems.data(),1,favoriteItems.size(),file)==favoriteItems.size();
    if(std::fclose(file)!=0) ok=false;
    if(ok && std::rename(temporary,FAVORITES_FILE)==0) favoritesPersistenceAvailable=true;
    else {std::remove(temporary);favoritesPersistenceAvailable=false;}
}
static void toggleFavorite(){
    if(visible.empty() || selected<0 || selected>=(int)visible.size()) return;
    int itemIndex=visible[selected];
    if(itemIndex<0 || itemIndex>=(int)favoriteItems.size()) return;
    favoriteItems[itemIndex]=favoriteItems[itemIndex]?0:1;
    saveFavorites();
    refresh();
}
static void toggleFavoritesView(){favoritesOnly=!favoritesOnly;selected=0;refresh();}
static void beginSearch(){searchActive=true;searchQuery.clear();keyboardIndex=0;selected=0;SDL_StartTextInput();refresh();}
static void endSearch(){searchActive=false;searchQuery.clear();SDL_StopTextInput();selected=0;refresh();}
static void handleSearchText(const char* input){if(!searchActive||!input)return;if(searchQuery.size()<48){searchQuery+=input;selected=0;refresh();}}
static void backspaceSearch(){if(searchActive&&!searchQuery.empty()){searchQuery.pop_back();selected=0;refresh();}}
static void moveVirtualKeyboard(int dx,int dy){
    int next=keyboardIndex+dx+dy*10;
    int count=(int)std::strlen(VIRTUAL_KEYS);
    if(next<0)next=0;
    if(next>=count)next=count-1;
    keyboardIndex=next;
}
static void activateVirtualKey(){
    int count=(int)std::strlen(VIRTUAL_KEYS);
    if(keyboardIndex<0||keyboardIndex>=count)return;
    char value=VIRTUAL_KEYS[keyboardIndex];
    if(value==' '){if(searchQuery.size()<48)searchQuery+=' ';}
    else if(searchQuery.size()<48)searchQuery+=value;
    selected=0;refresh();
}
static void moveHome(int dx,int dy){
    // The home menu has four valid actions arranged as a 3+1 grid.
    // Keep the selection in [0, 3] so enterCatalog() always maps safely.
    if(dx){
        if(homeAction==3){ if(dx<0)homeAction=2; }
        else homeAction=std::max(0,std::min(2,homeAction+dx));
    } else if(dy>0){
        if(homeAction<3)homeAction=3;
    } else if(dy<0){
        if(homeAction==3)homeAction=0;
    }
}
static void enterCatalog(){
    static const int actionFilters[]={0,1,2,3};
    filterIndex=actionFilters[homeAction];selected=0;showDetails=false;homeScreen=false;refresh();
}
static void drawHome(){
    fill(0,0,SW,SH,3,10,25);
    fill(0,0,SW,106,4,16,38);fill(0,104,SW,2,24,139,235);
    text(58,26,"HADES STORE",244,240,232,5);
    text(58,73,"CATALOGO PARA PS4",170,166,161,2);
    text(1470,54,"CENTRAL HOMEBREW",226,189,118,2);
    text(105,190,"CENTRAL HOMEBREW",226,189,118,3);
    text(100,274,"SEU UNIVERSO.",244,240,232,8);
    text(100,368,"SUAS POSSIBILIDADES.",169,149,219,6);
    text(105,480,"JOGOS, APLICATIVOS E EMULADORES",142,203,255,3);
    text(105,520,"TUDO PARA SEU PS4 EM UM SO LUGAR.",170,205,242,3);
    const char* actions[]={"EXPLORAR CATALOGO","JOGOS","APLICATIVOS","EMULADORES"};
    for(int i=0;i<4;i++){
        int x=105+(i%3)*280,y=615+(i/3)*72;
        bool active=i==homeAction;
        fill(x,y,252,52,active?8:5,active?91:22,active?190:39);
        outline(x,y,252,52,active?76:27,active?196:76,active?255:116,active?3:1);
        text(x+15,y+18,actions[i],255,255,255,2);
    }
    if(hadesTexture){SDL_Rect dst{1185,136,640,725};SDL_RenderCopy(renderer,hadesTexture,nullptr,&dst);}
    else {
        circle(1505,476,190,226,189,118);circle(1505,476,135,24,25,34);
        text(1378,435,"HADES",244,240,232,8);
    }
    text(105,825,"HADES  /  SEU PORTAL PS4",105,195,255,2);
    char count[64];std::snprintf(count,sizeof(count),"%d ITENS   %d CATEGORIAS",STORE_ITEM_COUNT,4);
    text(105,905,count,226,189,118,2);
    fill(55,976,1810,2,52,49,58);
    text(58,1000,"X SELECIONAR   DIRECIONAL NAVEGAR   O SAIR",170,166,161,2);
    text(1520,1000,"INTERFACE PARA CONTROLE",169,149,219,2);
    SDL_UpdateWindowSurface(windowHandle);
}
static void handleKey(SDL_Keycode key){
    if(homeScreen){
        if(key==SDLK_ESCAPE)running=false;
        else if(key==SDLK_LEFT)moveHome(-1,0);
        else if(key==SDLK_RIGHT)moveHome(1,0);
        else if(key==SDLK_UP)moveHome(0,-1);
        else if(key==SDLK_DOWN)moveHome(0,1);
        else if(key==SDLK_RETURN)enterCatalog();
        return;
    }
    if(key==SDLK_ESCAPE){if(searchActive)endSearch();else if(showDetails)showDetails=false;else running=false;}
    else if(key==SDLK_LEFT)handleDirection(-1,0);else if(key==SDLK_RIGHT)handleDirection(1,0);
    else if(key==SDLK_UP)handleDirection(0,-1);else if(key==SDLK_DOWN)handleDirection(0,1);
    else if(key==SDLK_SLASH)beginSearch();else if(key==SDLK_BACKSPACE)backspaceSearch();else if(key==SDLK_ESCAPE&&searchActive)endSearch();else if(key==SDLK_TAB)changeFilter(1);else if(key==SDLK_f)toggleFavorite();else if(key==SDLK_v)toggleFavoritesView();else if(key==SDLK_RETURN){if(showDetails)openSelected();else showDetails=true;}
}
static void handleButton(Uint8 button){
    if(homeScreen){if(button==0)enterCatalog();else if(button==1)running=false;return;}
    if(button==4)changeFilter(-1);else if(button==5)changeFilter(1);
    else if(button==0){if(showDetails)openSelected();else showDetails=true;}
    else if(button==1)showDetails=false;else if(button==2)openSelected();else if(button==6)running=false;else if(button==8)toggleFavorite();else if(button==9)toggleFavoritesView();
}
static void handleControllerButton(SDL_GameControllerButton button){
    if(homeScreen){
        if(button==SDL_CONTROLLER_BUTTON_DPAD_LEFT)moveHome(-1,0);
        else if(button==SDL_CONTROLLER_BUTTON_DPAD_RIGHT)moveHome(1,0);
        else if(button==SDL_CONTROLLER_BUTTON_DPAD_UP)moveHome(0,-1);
        else if(button==SDL_CONTROLLER_BUTTON_DPAD_DOWN)moveHome(0,1);
        else if(button==SDL_CONTROLLER_BUTTON_A)enterCatalog();
        else if(button==SDL_CONTROLLER_BUTTON_START)enterCatalog();
        else if(button==SDL_CONTROLLER_BUTTON_B)running=false;
        return;
    }
    if(button==SDL_CONTROLLER_BUTTON_LEFTSHOULDER)changeFilter(-1);
    else if(button==SDL_CONTROLLER_BUTTON_RIGHTSHOULDER)changeFilter(1);
    else if(button==SDL_CONTROLLER_BUTTON_A){if(showDetails)openSelected();else showDetails=true;}
    else if(button==SDL_CONTROLLER_BUTTON_B){if(showDetails)showDetails=false;else running=false;}
    else if(button==SDL_CONTROLLER_BUTTON_X)openSelected();
    else if(button==SDL_CONTROLLER_BUTTON_LEFTSTICK)toggleFavorite();
    else if(button==SDL_CONTROLLER_BUTTON_RIGHTSTICK)toggleFavoritesView();
    else if(button==SDL_CONTROLLER_BUTTON_Y){homeScreen=true;showDetails=false;}else if(button==SDL_CONTROLLER_BUTTON_START)running=false;
    else if(button==SDL_CONTROLLER_BUTTON_DPAD_UP)handleDirection(0,-1);
    else if(button==SDL_CONTROLLER_BUTTON_DPAD_DOWN)handleDirection(0,1);
    else if(button==SDL_CONTROLLER_BUTTON_DPAD_LEFT)handleDirection(-1,0);
    else if(button==SDL_CONTROLLER_BUTTON_DPAD_RIGHT)handleDirection(1,0);
}
int main(int argc,char** argv){
    (void)argc;(void)argv;setvbuf(stdout,nullptr,_IONBF,0);favoriteItems.assign(STORE_ITEM_COUNT,0);loadFavorites();refresh();coverTextures.resize(STORE_ITEM_COUNT,nullptr);
    if(SDL_Init(SDL_INIT_VIDEO|SDL_INIT_JOYSTICK|SDL_INIT_GAMECONTROLLER)!=0)return 1;
    SDL_SetHint(SDL_HINT_RENDER_SCALE_QUALITY,"2");
    windowHandle=SDL_CreateWindow("HADES STORE",SDL_WINDOWPOS_UNDEFINED,SDL_WINDOWPOS_UNDEFINED,SW,SH,0);
    if(!windowHandle){SDL_Quit();return 2;}
    SDL_Surface* surface=SDL_GetWindowSurface(windowHandle);renderer=surface?SDL_CreateSoftwareRenderer(surface):nullptr;
    if(!renderer){SDL_DestroyWindow(windowHandle);SDL_Quit();return 3;}
    SDL_SetRenderDrawBlendMode(renderer,SDL_BLENDMODE_BLEND);
    fontTexture=loadTexture("/app0/sce_sys/fonts/atlas.bmp",true);
    hadesTexture=loadTexture("/app0/sce_sys/hades-hero.bmp");
    avatarTexture=loadTexture("/app0/sce_sys/hades-avatar.bmp");
    bannerTexture=loadTexture("/app0/sce_sys/hades-banner.bmp");
    sigilTexture=loadTexture("/app0/sce_sys/hades-sigil.bmp");
    SDL_JoystickEventState(SDL_ENABLE);SDL_GameControllerEventState(SDL_ENABLE);
    if(SDL_NumJoysticks()>0){if(SDL_IsGameController(0))gameController=SDL_GameControllerOpen(0);else SDL_JoystickOpen(0);}
    while(running){SDL_Event e;if(SDL_WaitEventTimeout(&e,16))do{
        if(e.type==SDL_QUIT)running=false;
        else if(e.type==SDL_KEYDOWN){handleKey(e.key.keysym.sym);frameDirty=true;}
        else if(e.type==SDL_CONTROLLERBUTTONDOWN){handleControllerButton((SDL_GameControllerButton)e.cbutton.button);frameDirty=true;}
        else if(e.type==SDL_TEXTINPUT){handleSearchText(e.text.text);frameDirty=true;}
        else if(e.type==SDL_CONTROLLERAXISMOTION){
            static Uint32 lastAxisMove=0;
            Uint32 now=SDL_GetTicks();
            if(now-lastAxisMove>160 && (e.caxis.axis==SDL_CONTROLLER_AXIS_LEFTX || e.caxis.axis==SDL_CONTROLLER_AXIS_LEFTY)){
                int dx=(e.caxis.axis==SDL_CONTROLLER_AXIS_LEFTX)?(e.caxis.value>16000?1:(e.caxis.value<-16000?-1:0)):0;
                int dy=(e.caxis.axis==SDL_CONTROLLER_AXIS_LEFTY)?(e.caxis.value>16000?1:(e.caxis.value<-16000?-1:0)):0;
                if(dx||dy){if(searchActive)moveVirtualKeyboard(dx,dy);else if(homeScreen)moveHome(dx,dy);else handleDirection(dx,dy);lastAxisMove=now;frameDirty=true;}
            }
        }
        else if(e.type==SDL_JOYBUTTONDOWN&&!gameController){handleButton(e.jbutton.button);frameDirty=true;}
        else if(e.type==SDL_JOYHATMOTION){int dx=(e.jhat.value&SDL_HAT_RIGHT)?1:(e.jhat.value&SDL_HAT_LEFT)?-1:0;int dy=(e.jhat.value&SDL_HAT_DOWN)?1:(e.jhat.value&SDL_HAT_UP)?-1:0;if(homeScreen)moveHome(dx,dy);else handleDirection(dx,dy);frameDirty=true;}
        else if(e.type==SDL_WINDOWEVENT)frameDirty=true;
    }while(SDL_PollEvent(&e));if(frameDirty){if(homeScreen)drawHome();else draw();frameDirty=false;}}
    if(hadesTexture)SDL_DestroyTexture(hadesTexture);if(avatarTexture)SDL_DestroyTexture(avatarTexture);if(bannerTexture)SDL_DestroyTexture(bannerTexture);if(sigilTexture)SDL_DestroyTexture(sigilTexture);for(SDL_Texture* texture:coverTextures)if(texture)SDL_DestroyTexture(texture);
    if(fontTexture)SDL_DestroyTexture(fontTexture);
    SDL_DestroyRenderer(renderer);SDL_DestroyWindow(windowHandle);SDL_Quit();return 0;
}

