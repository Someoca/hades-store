// HADES Store native catalog viewer for PS4 (OpenOrbis + SDL2).
#include <SDL2/SDL.h>
#include <orbis/Sysmodule.h>
#include <algorithm>
#include <cstdio>
#include <cstring>
#include <string>
#include <vector>
#include "generated_catalog.h"

extern "C" int sceSystemServiceLaunchWebBrowser(const char* uri, void* reserved);

static const int SW = 1920, SH = 1080, ITEMS_PER_PAGE = 8;
static const char* FILTERS[] = {"TODOS", "APLICATIVOS", "HOMEBREWS", "EMULADORES", "JOGOS PS4"};
static const int FILTER_COUNT = 5;
static SDL_Window* windowHandle = nullptr;
static SDL_Renderer* renderer = nullptr;
static SDL_GameController* gameController = nullptr;
static SDL_Texture* fontTexture = nullptr;
static std::vector<SDL_Texture*> coverTextures;
static SDL_Texture* hadesTexture = nullptr;
static std::vector<int> visible;
static int selected = 0, filterIndex = 0;
static int homeAction = 0;
static bool homeScreen = true, showDetails = false, running = true;

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
static bool matches(const char* category){
    if(filterIndex==0) return true;
    if(filterIndex==1) return !std::strcmp(category,"Aplicativos");
    if(filterIndex==2) return !std::strcmp(category,"Homebrews");
    if(filterIndex==3) return !std::strcmp(category,"Emuladores");
    return !std::strcmp(category,"Jogos");
}
static void refresh(){
    visible.clear();
    for(int i=0;i<STORE_ITEM_COUNT;i++) if(matches(STORE_ITEMS[i].category)) visible.push_back(i);
    if(visible.empty()) selected=0; else selected=std::min(selected,(int)visible.size()-1);
}
static int countCategory(const char* category){int n=0;for(int i=0;i<STORE_ITEM_COUNT;i++)if(!std::strcmp(STORE_ITEMS[i].category,category))n++;return n;}
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
    int col=slot%4,row=slot/4,x=50+col*455,y=258+row*354,w=440,h=338;
    fill(x,y,w,h,active?28:17,active?26:19,active?35:27);
    outline(x,y,w,h,active?226:52,active?189:49,active?118:58,active?4:2);
    const StoreItem& it=STORE_ITEMS[itemIndex];
    fill(x+10,y+10,w-20,185,22,21,29);
    int discX=x+288,discY=y+101;
    circle(discX,discY,78,68,67,73);circle(discX,discY,73,33,33,40);circle(discX,discY,66,56,55,62);
    circle(discX,discY,46,31,30,37);circle(discX,discY,15,151,144,132);circle(discX,discY,8,18,18,23);
    drawCover(itemIndex,x+57,y+16,126,174);
    text(x+20,y+211,trim(it.name,33),244,240,232,3,x+w-15);
    text(x+20,y+257,trim(it.description,48),170,166,161,2,x+w-15);
    text(x+20,y+309,trim(it.category,22),226,189,118,2);
    text(x+w-153,y+309,"X VER DETALHES",169,149,219,2);
}
static void wrapText(int x,int y,const char* raw,Uint8 r,Uint8 g,Uint8 b,int chars=70){
    std::string s=raw?raw:""; int line=0;
    while(!s.empty()&&line<5){size_t n=std::min((size_t)chars,s.size());if(n<s.size()){size_t k=s.rfind(' ',n);if(k!=std::string::npos&&k>0)n=k;}text(x,y+line*36,s.substr(0,n),r,g,b,3);s.erase(0,n);while(!s.empty()&&s[0]==' ')s.erase(0,1);line++;}
}
static void draw(){
    fill(0,0,SW,SH,8,9,14);
    fill(0,0,SW,125,17,19,27); fill(0,122,SW,2,52,49,58);
    text(58,29,"HADES STORE",244,240,232,5);
    text(58,80,"DESCUBRA   /   BIBLIOTECA",170,166,161,2);
    char stats[100]; std::snprintf(stats,sizeof(stats),"%d JOGOS  %d APLICATIVOS  %d EMULADORES",countCategory("Jogos"),countCategory("Aplicativos"),countCategory("Emuladores"));
    text(1270,68,stats,226,189,118,2);
    int fx=50; for(int i=0;i<FILTER_COUNT;i++){int width=(i==4?200:190);bool active=i==filterIndex;fill(fx,145,width,45,active?42:24,active?35:25,active?48:34);outline(fx,145,width,45,active?226:52,active?189:49,active?118:58,active?2:1);text(fx+14,162,FILTERS[i],active?226:170,active?189:166,active?118:161,2);fx+=width+12;}
    text(50,218,"CATALOGO",244,240,232,3);
    if(visible.empty()){text(75,390,"NENHUM ITEM NESTA CATEGORIA",241,239,247,4);}
    else {int page=(selected/ITEMS_PER_PAGE)*ITEMS_PER_PAGE;for(int slot=0;slot<ITEMS_PER_PAGE&&page+slot<(int)visible.size();slot++)drawCard(slot,visible[page+slot],page+slot==selected);}
    fill(50,1015,1820,2,52,49,58);
    text(52,1032,"L1 R1 CATEGORIAS    DIRECIONAL NAVEGAR    X DETALHES    O INICIO",170,166,161,2);
    text(1600,1032,"HADES STORE",226,189,118,2);
    if(showDetails&&!visible.empty()){
        fill(0,0,SW,SH,0,0,0,210);fill(235,145,1450,790,17,19,27);outline(235,145,1450,790,226,189,118,3);
        const StoreItem& it=STORE_ITEMS[visible[selected]];
        drawCover(visible[selected],290,275,270,405);
        text(625,265,"DETALHES DO ITEM",226,189,118,3);text(625,325,trim(it.name,54),244,240,232,5);
        text(625,395,trim(it.category,30),169,149,219,3);wrapText(625,455,it.description,170,166,161,75);
        text(625,690,"X ABRIR LINK NO NAVEGADOR DO PS4",226,189,118,3);
        text(625,748,trim(it.url,100),170,166,161,2);
        text(625,930,"O VOLTAR AO CATALOGO",170,166,161,2);
    }
    SDL_UpdateWindowSurface(windowHandle);
}
static void openSelected(){if(visible.empty())return;const char* url=STORE_ITEMS[visible[selected]].url;if(url&&url[0])sceSystemServiceLaunchWebBrowser(url,nullptr);}
static void handleDirection(int dx,int dy){
    if(showDetails)return;
    if(visible.empty())return;
    int next=selected+dx+dy*4; if(next<0)next=0;if(next>=(int)visible.size())next=(int)visible.size()-1;selected=next;
}
static void changeFilter(int amount){filterIndex=(filterIndex+amount+FILTER_COUNT)%FILTER_COUNT;selected=0;refresh();}
static void moveHome(int dx,int dy){
    if(dx){if(homeAction<3)homeAction=std::max(0,std::min(2,homeAction+dx));else homeAction=dx<0?3:4;}
    else if(dy>0){if(homeAction<3)homeAction=std::min(4,homeAction+3);else homeAction-=3;}
    else if(dy<0&&homeAction>=3)homeAction-=3;
}
static void enterCatalog(){
    static const int actionFilters[]={0,1,2,3,4};
    filterIndex=actionFilters[homeAction];selected=0;showDetails=false;homeScreen=false;refresh();
}
static void drawHome(){
    fill(0,0,SW,SH,8,9,14);
    fill(0,0,SW,106,17,19,27);fill(0,104,SW,2,52,49,58);
    text(58,26,"HADES STORE",244,240,232,5);
    text(58,73,"CATALOGO PARA PS4",170,166,161,2);
    text(1470,54,"CENTRAL HOMEBREW",226,189,118,2);
    text(105,190,"CENTRAL HOMEBREW",226,189,118,3);
    text(100,274,"SEU UNIVERSO.",244,240,232,8);
    text(100,368,"SUAS POSSIBILIDADES.",169,149,219,6);
    text(105,480,"APLICATIVOS, HOMEBREWS, EMULADORES",170,166,161,3);
    text(105,520,"E JOGOS PARA PS4 EM UM SO LUGAR.",170,166,161,3);
    const char* actions[]={"EXPLORAR CATALOGO","APLICATIVOS","HOMEBREWS","EMULADORES","JOGOS PS4"};
    for(int i=0;i<5;i++){
        int x=105+(i%3)*280,y=615+(i/3)*72;
        bool active=i==homeAction;
        fill(x,y,252,52,active?226:24,active?189:25,active?118:34);
        outline(x,y,252,52,active?226:52,active?189:49,active?118:58,active?3:1);
        text(x+15,y+18,actions[i],active?23:170,active?18:166,active?10:161,2);
    }
    if(hadesTexture){SDL_Rect dst{1185,136,640,725};SDL_RenderCopy(renderer,hadesTexture,nullptr,&dst);}
    else {
        circle(1505,476,190,226,189,118);circle(1505,476,135,24,25,34);
        text(1378,435,"HADES",244,240,232,8);
    }
    text(105,825,"HADES  /  SEU PORTAL PS4",226,189,118,2);
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
    if(key==SDLK_ESCAPE){if(showDetails)showDetails=false;else homeScreen=true;}
    else if(key==SDLK_LEFT)handleDirection(-1,0);else if(key==SDLK_RIGHT)handleDirection(1,0);
    else if(key==SDLK_UP)handleDirection(0,-1);else if(key==SDLK_DOWN)handleDirection(0,1);
    else if(key==SDLK_TAB)changeFilter(1);else if(key==SDLK_RETURN){if(showDetails)openSelected();else showDetails=true;}
}
static void handleButton(Uint8 button){
    if(homeScreen){if(button==0)enterCatalog();else if(button==1)running=false;return;}
    if(button==4)changeFilter(-1);else if(button==5)changeFilter(1);
    else if(button==0){if(showDetails)openSelected();else showDetails=true;}
    else if(button==1)showDetails=false;else if(button==2)openSelected();else if(button==6)running=false;
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
    else if(button==SDL_CONTROLLER_BUTTON_B){if(showDetails)showDetails=false;else homeScreen=true;}
    else if(button==SDL_CONTROLLER_BUTTON_X)openSelected();
    else if(button==SDL_CONTROLLER_BUTTON_START)running=false;
    else if(button==SDL_CONTROLLER_BUTTON_DPAD_UP)handleDirection(0,-1);
    else if(button==SDL_CONTROLLER_BUTTON_DPAD_DOWN)handleDirection(0,1);
    else if(button==SDL_CONTROLLER_BUTTON_DPAD_LEFT)handleDirection(-1,0);
    else if(button==SDL_CONTROLLER_BUTTON_DPAD_RIGHT)handleDirection(1,0);
}
int main(int argc,char** argv){
    (void)argc;(void)argv;setvbuf(stdout,nullptr,_IONBF,0);refresh();coverTextures.resize(STORE_ITEM_COUNT,nullptr);
    if(SDL_Init(SDL_INIT_VIDEO|SDL_INIT_JOYSTICK|SDL_INIT_GAMECONTROLLER)!=0)return 1;
    SDL_SetHint(SDL_HINT_RENDER_SCALE_QUALITY,"2");
    windowHandle=SDL_CreateWindow("HADES STORE",SDL_WINDOWPOS_UNDEFINED,SDL_WINDOWPOS_UNDEFINED,SW,SH,0);
    if(!windowHandle){SDL_Quit();return 2;}
    SDL_Surface* surface=SDL_GetWindowSurface(windowHandle);renderer=surface?SDL_CreateSoftwareRenderer(surface):nullptr;
    if(!renderer){SDL_DestroyWindow(windowHandle);SDL_Quit();return 3;}
    SDL_SetRenderDrawBlendMode(renderer,SDL_BLENDMODE_BLEND);
    fontTexture=loadTexture("/app0/sce_sys/fonts/atlas.bmp",true);
    hadesTexture=loadTexture("/app0/sce_sys/hades-hero.bmp");
    SDL_JoystickEventState(SDL_ENABLE);SDL_GameControllerEventState(SDL_ENABLE);
    if(SDL_NumJoysticks()>0){if(SDL_IsGameController(0))gameController=SDL_GameControllerOpen(0);else SDL_JoystickOpen(0);}
    while(running){SDL_Event e;while(SDL_PollEvent(&e)){
        if(e.type==SDL_QUIT)running=false;
        else if(e.type==SDL_KEYDOWN)handleKey(e.key.keysym.sym);
        else if(e.type==SDL_CONTROLLERBUTTONDOWN)handleControllerButton((SDL_GameControllerButton)e.cbutton.button);
        else if(e.type==SDL_JOYBUTTONDOWN&&!gameController)handleButton(e.jbutton.button);
        else if(e.type==SDL_JOYHATMOTION){int dx=(e.jhat.value&SDL_HAT_RIGHT)?1:(e.jhat.value&SDL_HAT_LEFT)?-1:0;int dy=(e.jhat.value&SDL_HAT_DOWN)?1:(e.jhat.value&SDL_HAT_UP)?-1:0;if(homeScreen)moveHome(dx,dy);else handleDirection(dx,dy);}
    }if(homeScreen)drawHome();else draw();SDL_Delay(16);}
    if(hadesTexture)SDL_DestroyTexture(hadesTexture);for(SDL_Texture* texture:coverTextures)if(texture)SDL_DestroyTexture(texture);
    if(fontTexture)SDL_DestroyTexture(fontTexture);
    SDL_DestroyRenderer(renderer);SDL_DestroyWindow(windowHandle);SDL_Quit();return 0;
}


