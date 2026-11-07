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

static const int SW = 1920, SH = 1080, ITEMS_PER_PAGE = 12;
static const char* FILTERS[] = {"TODOS", "JOGOS", "APLICATIVOS", "HOMEBREWS", "EMULADORES"};
static const int FILTER_COUNT = 5;
static SDL_Window* windowHandle = nullptr;
static SDL_Renderer* renderer = nullptr;
static SDL_GameController* gameController = nullptr;
static std::vector<int> visible;
static int selected = 0, filterIndex = 0;
static bool showDetails = false, running = true;

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
    if(filterIndex==1) return !std::strcmp(category,"Jogos");
    if(filterIndex==2) return !std::strcmp(category,"Aplicativos");
    if(filterIndex==3) return !std::strcmp(category,"Homebrews");
    return !std::strcmp(category,"Emuladores");
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
static void drawCard(int slot,int itemIndex,bool active){
    int col=slot%4,row=slot/4,x=60+col*455,y=215+row*270,w=435,h=245;
    fill(x,y,w,h,active?32:19,active?26:23,active?41:34);
    outline(x,y,w,h,active?255:57,active?172:65,active?82:87,active?4:2);
    fill(x+14,y+14,126,217,13,17,28);
    circle(x+77,y+98,48,active?255:77,active?153:99,active?75:112);
    circle(x+77,y+98,18,20,24,35);
    text(x+49,y+87,"H",245,242,250,4);
    text(x+22,y+181,"HADES",active?255:98,active?168:185,active?91:198,2);
    const StoreItem& it=STORE_ITEMS[itemIndex];
    text(x+158,y+27,trim(it.category,22),98,224,233,2);
    text(x+158,y+69,trim(it.name,32),245,242,250,3,x+w-16);
    text(x+158,y+123,trim(it.description,43),157,166,187,2,x+w-16);
    if(!std::strcmp(it.category,"Jogos")) text(x+158,y+194,"PLAYSTATION STORE",255,181,96,2);
    else text(x+158,y+194,"LINK OFICIAL",255,181,96,2);
}
static void wrapText(int x,int y,const char* raw,Uint8 r,Uint8 g,Uint8 b,int chars=70){
    std::string s=raw?raw:""; int line=0;
    while(!s.empty()&&line<5){size_t n=std::min((size_t)chars,s.size());if(n<s.size()){size_t k=s.rfind(' ',n);if(k!=std::string::npos&&k>0)n=k;}text(x,y+line*36,s.substr(0,n),r,g,b,3);s.erase(0,n);while(!s.empty()&&s[0]==' ')s.erase(0,1);line++;}
}
static void draw(){
    fill(0,0,SW,SH,8,10,17);
    fill(0,0,SW,150,13,16,27); fill(0,146,SW,4,255,99,69);
    text(62,42,"HADES STORE",246,241,249,6);
    text(62,93,"CATALOGO COM NAVEGACAO PELO CONTROLE",142,152,174,2);
    char stats[100]; std::snprintf(stats,sizeof(stats),"%d JOGOS  %d APLICATIVOS  %d EMULADORES",countCategory("Jogos"),countCategory("Aplicativos"),countCategory("Emuladores"));
    text(1130,75,stats,98,223,233,2);
    int fx=60; for(int i=0;i<FILTER_COUNT;i++){int width=210;fill(fx,165,width,39,i==filterIndex?255:26,i==filterIndex?99:31,i==filterIndex?69:47);text(fx+14,177,FILTERS[i],i==filterIndex?12:204,i==filterIndex?13:210,i==filterIndex?18:220,2);fx+=width+10;}
    if(visible.empty()){text(75,330,"NENHUM ITEM NESTA CATEGORIA",241,239,247,4);}
    else {int page=(selected/ITEMS_PER_PAGE)*ITEMS_PER_PAGE;for(int slot=0;slot<ITEMS_PER_PAGE&&page+slot<(int)visible.size();slot++)drawCard(slot,visible[page+slot],page+slot==selected);}
    fill(60,1020,1800,2,55,62,78);
    text(62,1034,"L1 R1 CATEGORIAS   DIRECIONAL NAVEGAR   X DETALHES   O VOLTAR",155,165,184,2);
    text(1540,1034,"SELECAO",255,172,90,2);
    if(showDetails&&!visible.empty()){
        fill(0,0,SW,SH,0,0,0,210);fill(235,145,1450,790,8,12,20);outline(235,145,1450,790,255,103,75,4);
        const StoreItem& it=STORE_ITEMS[visible[selected]];
        text(290,265,"DETALHES DO ITEM",255,166,124,3);text(290,325,trim(it.name,54),248,244,250,5);
        text(290,395,trim(it.category,30),97,224,232,3);wrapText(290,455,it.description,177,185,201,76);
        text(290,690,"X ABRIR LINK OFICIAL NO NAVEGADOR DO PS4",255,178,97,3);
        text(290,748,trim(it.url,100),151,168,190,2);
        text(290,930,"O VOLTAR AO CATALOGO",151,168,190,2);
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
static void handleKey(SDL_Keycode key){
    if(key==SDLK_ESCAPE){if(showDetails)showDetails=false;else running=false;}
    else if(key==SDLK_LEFT)handleDirection(-1,0);else if(key==SDLK_RIGHT)handleDirection(1,0);
    else if(key==SDLK_UP)handleDirection(0,-1);else if(key==SDLK_DOWN)handleDirection(0,1);
    else if(key==SDLK_TAB)changeFilter(1);else if(key==SDLK_RETURN){if(showDetails)openSelected();else showDetails=true;}
}
static void handleButton(Uint8 button){
    if(button==4)changeFilter(-1);else if(button==5)changeFilter(1);
    else if(button==0){if(showDetails)openSelected();else showDetails=true;}
    else if(button==1)showDetails=false;else if(button==2)openSelected();else if(button==6)running=false;
}
static void handleControllerButton(SDL_GameControllerButton button){
    if(button==SDL_CONTROLLER_BUTTON_LEFTSHOULDER)changeFilter(-1);
    else if(button==SDL_CONTROLLER_BUTTON_RIGHTSHOULDER)changeFilter(1);
    else if(button==SDL_CONTROLLER_BUTTON_A){if(showDetails)openSelected();else showDetails=true;}
    else if(button==SDL_CONTROLLER_BUTTON_B)showDetails=false;
    else if(button==SDL_CONTROLLER_BUTTON_X)openSelected();
    else if(button==SDL_CONTROLLER_BUTTON_START)running=false;
    else if(button==SDL_CONTROLLER_BUTTON_DPAD_UP)handleDirection(0,-1);
    else if(button==SDL_CONTROLLER_BUTTON_DPAD_DOWN)handleDirection(0,1);
    else if(button==SDL_CONTROLLER_BUTTON_DPAD_LEFT)handleDirection(-1,0);
    else if(button==SDL_CONTROLLER_BUTTON_DPAD_RIGHT)handleDirection(1,0);
}
int main(int argc,char** argv){
    (void)argc;(void)argv;setvbuf(stdout,nullptr,_IONBF,0);refresh();
    if(SDL_Init(SDL_INIT_VIDEO|SDL_INIT_JOYSTICK|SDL_INIT_GAMECONTROLLER)!=0)return 1;
    windowHandle=SDL_CreateWindow("HADES STORE",SDL_WINDOWPOS_UNDEFINED,SDL_WINDOWPOS_UNDEFINED,SW,SH,0);
    if(!windowHandle){SDL_Quit();return 2;}
    SDL_Surface* surface=SDL_GetWindowSurface(windowHandle);renderer=surface?SDL_CreateSoftwareRenderer(surface):nullptr;
    if(!renderer){SDL_DestroyWindow(windowHandle);SDL_Quit();return 3;}
    SDL_JoystickEventState(SDL_ENABLE);SDL_GameControllerEventState(SDL_ENABLE);
    if(SDL_NumJoysticks()>0){if(SDL_IsGameController(0))gameController=SDL_GameControllerOpen(0);else SDL_JoystickOpen(0);}
    while(running){SDL_Event e;while(SDL_PollEvent(&e)){
        if(e.type==SDL_QUIT)running=false;
        else if(e.type==SDL_KEYDOWN)handleKey(e.key.keysym.sym);
        else if(e.type==SDL_CONTROLLERBUTTONDOWN)handleControllerButton((SDL_GameControllerButton)e.cbutton.button);
        else if(e.type==SDL_JOYBUTTONDOWN&&!gameController)handleButton(e.jbutton.button);
        else if(e.type==SDL_JOYHATMOTION){int dx=(e.jhat.value&SDL_HAT_RIGHT)?1:(e.jhat.value&SDL_HAT_LEFT)?-1:0;int dy=(e.jhat.value&SDL_HAT_DOWN)?1:(e.jhat.value&SDL_HAT_UP)?-1:0;handleDirection(dx,dy);}
    }draw();SDL_Delay(16);}
    SDL_DestroyRenderer(renderer);SDL_DestroyWindow(windowHandle);SDL_Quit();return 0;
}


