import { describe, it, expect } from 'vitest';
import { useDemo } from '../store';

describe('Member phone screen (side by side)', () => {
  it('is kept in the store, so a remounted phone stays where it was', () => {
    useDemo.getState().setMemberPath('/sage');
    useDemo.getState().setRole('member');
    useDemo.getState().setRole('np');
    expect(useDemo.getState().memberPath).toBe('/sage');
  });

  it('goes back to Home on sign-out, sign-in, scenario jump and reset', () => {
    const s = () => useDemo.getState();
    for (const act of [() => s().signOut('member'), () => s().signInMember(), () => s().loadScenario('released'), () => s().reset()]) {
      s().setMemberPath('/report/body');
      act();
      expect(s().memberPath).toBe('/home');
    }
  });
});
